#!/bin/bash

LANGUAGE="javascript"
CODEQL_DIR=".codeql"
DATABASE_PATH="$CODEQL_DIR/database"
QUERY_OUTPUT="$DATABASE_PATH/results.sarif"
OUTPUT_FORMAT="sarif-latest"
DOCKER_IMAGE="codeql-env"
BASE_DIR="$(cd "$(dirname "$0")"; pwd)"

# Colors
bold=$(tput bold)
reset=$(tput sgr0)
red=$(tput setaf 1)
green=$(tput setaf 2)
blue=$(tput setaf 4)
yellow=$(tput setaf 3)

while getopts ":s:r:" opt; do
  case $opt in
    s) SRC_DIR="$OPTARG" ;;
    r) CODEQL_DIR="$OPTARG"; DATABASE_PATH="$CODEQL_DIR/database"; QUERY_OUTPUT="$DATABASE_PATH/results.sarif" ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 1 ;;
  esac
done

if [ -z "$SRC_DIR" ]; then
    echo "Usage: $0 -s <source_dir> [-r <results_dir>]"
    exit 1
fi

mkdir -p "$CODEQL_DIR"

# Check the architecture
ARCH=$(uname -m)
PLATFORM_FLAG=""

# CodeQL CLI binary does not support arm64 architecture, setting the platform to linux/amd64
if [[ "$ARCH" == "arm64" ]]; then
    PLATFORM_FLAG="--platform linux/amd64"
fi

if [[ "$(docker images -q $DOCKER_IMAGE 2> /dev/null)" == "" ]]; then
    echo "Docker image $DOCKER_IMAGE not found. Building locally..."
    docker build $PLATFORM_FLAG -t "$DOCKER_IMAGE" -f "$BASE_DIR/codeql.dockerfile" "$BASE_DIR"
    if [ $? -ne 0 ]; then
        echo "${red}Docker image build failed.${reset}"
        exit 1
    fi
fi

cleanup_database() {
  echo "Deleting contents of $CODEQL_DIR."
  rm -rf "$CODEQL_DIR"/*
}

SRC_DIR="$(cd "$(dirname "$SRC_DIR")"; pwd)/$(basename "$SRC_DIR")"
CODEQL_DIR="$(cd "$(dirname "$CODEQL_DIR")"; pwd)/$(basename "$CODEQL_DIR")"
DATABASE_PATH="$(cd "$(dirname "$DATABASE_PATH")"; pwd)/$(basename "$DATABASE_PATH")"

# Step 1: Run the Docker container to create a CodeQL database from the source code.
echo "Creating a CodeQL database from the source code: $SRC_DIR"
docker run $PLATFORM_FLAG --rm -v "$SRC_DIR":/workspace/source-code \
    -v "${DATABASE_PATH}":/workspace/shared $DOCKER_IMAGE \
    "codeql database create /workspace/shared/codeql-db --language=javascript --source-root=/workspace/source-code --overwrite"

if [ $? -ne 0 ]; then
  echo "CodeQL database creation failed."
  cleanup_database
  exit 1
fi

echo "Analyzing a CodeQL database: $DATABASE_PATH"
# Step 2: Run the Docker container to analyze the CodeQL database.
docker run $PLATFORM_FLAG --rm -v "${DATABASE_PATH}":/workspace/shared $DOCKER_IMAGE \
    "codeql database analyze --format=${OUTPUT_FORMAT} --output=/workspace/shared/results.sarif /workspace/shared/codeql-db javascript-security-and-quality.qls"

if [ $? -ne 0 ]; then
  echo "CodeQL database analysis failed."
  cleanup_database
  exit 1
fi

# Step 3: Print summary of SARIF results
echo "Analysis complete. Results saved to $QUERY_OUTPUT"
if command -v jq &> /dev/null; then
    vulnerabilities=$(jq -r '.runs[] | select(.results | length > 0)' "$QUERY_OUTPUT")

    if [[ -z "$vulnerabilities" ]]; then
        echo "${blue}${bold}No vulnerabilities found in the SARIF results.${reset}"
    else
        echo "${yellow}${bold}Summary of SARIF results:${reset}"
        jq -r '
          .runs[] |
          .results[] as $result |
          .tool.driver.rules[] as $rule |
          select($rule.id == $result.ruleId) |
          "Rule: \($result.ruleId)\nMessage: \($result.message.text)\nFile: \($result.locations[].physicalLocation.artifactLocation.uri)\nLine: \($result.locations[].physicalLocation.region.startLine)\nSecurity Severity: \($rule.properties."security-severity" // "N/A")\n"' "$QUERY_OUTPUT" |
        while IFS= read -r line; do
            case "$line" in
                Rule:*)
                    echo "${red}${bold}$line${reset}"
                    ;;
                Message:*)
                    echo "${green}$line${reset}"
                    ;;
                File:*)
                    echo "${blue}$line${reset}"
                    ;;
                Line:*)
                    echo "${yellow}$line${reset}"
                    ;;
                Security\ Severity:*)
                    echo "${yellow}$line${reset}"
                    ;;
                *)
                    echo "$line"
                    ;;
            esac
        done
    fi
else
    echo "${red}${bold}Please install jq to display a summary of the SARIF results.${reset}"
    echo "${bold}You can view the full results in the SARIF file using a SARIF viewer.${reset}"
fi
