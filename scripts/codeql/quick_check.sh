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

RUN_TESTS=false

while getopts ":s:r:q:t" opt; do
  case $opt in
    s) SRC_DIR="$OPTARG" ;;
    r) CODEQL_DIR="$OPTARG"; DATABASE_PATH="$CODEQL_DIR/database"; QUERY_OUTPUT="$DATABASE_PATH/results.sarif" ;;
    q) QUERY_DIR="$OPTARG" ;;
    t) RUN_TESTS=true ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 1 ;;
  esac
done

if [ "$RUN_TESTS" = true ]; then
    if [ -z "$QUERY_DIR" ]; then
        echo "Usage: $0 -t -q <test_dir|qlpack_dir>"
        echo "  -t              Run CodeQL unit tests instead of analysis"
        echo "  -q <dir>        Test directory (with .qlref) or qlpack root to run all tests"
        exit 1
    fi
elif [ -z "$SRC_DIR" ]; then
    echo "Usage: $0 -s <source_dir> [-r <results_dir>] [-q <query_dir>]"
    echo "       $0 -t -q <test_dir|qlpack_dir>"
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

# ---------------------------------------------------------------------------
# Test mode: run codeql test run inside Docker and exit
# ---------------------------------------------------------------------------
if [ "$RUN_TESTS" = true ]; then
    QUERY_DIR="$(cd "$(dirname "$QUERY_DIR")"; pwd)/$(basename "$QUERY_DIR")"

    # Find the qlpack root so we can mount it and resolve test paths
    QLPACK_DIR="$QUERY_DIR"
    if [ -f "$QLPACK_DIR" ]; then
        QLPACK_DIR="$(dirname "$QLPACK_DIR")"
    fi
    while [ "$QLPACK_DIR" != "/" ]; do
        if [ -f "$QLPACK_DIR/qlpack.yml" ] || [ -f "$QLPACK_DIR/codeql-pack.yml" ]; then
            break
        fi
        QLPACK_DIR="$(dirname "$QLPACK_DIR")"
    done
    if [ "$QLPACK_DIR" = "/" ]; then
        echo "${red}Error: Could not find qlpack.yml for the given query/test directory${reset}"
        exit 1
    fi

    TEST_REL_PATH="${QUERY_DIR#$QLPACK_DIR/}"

    echo "${bold}Running CodeQL unit tests${reset}"
    echo "  qlpack: $QLPACK_DIR"
    echo "  tests:  $TEST_REL_PATH"

    docker run $PLATFORM_FLAG --rm \
        -v "${QLPACK_DIR}":/workspace/queries $DOCKER_IMAGE \
        "codeql test run /workspace/queries/${TEST_REL_PATH} --additional-packs /workspace/queries"

    exit $?
fi

# ---------------------------------------------------------------------------
# Analysis mode
# ---------------------------------------------------------------------------
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
if [ -n "$QUERY_DIR" ]; then
    # Resolve to absolute path
    QUERY_DIR="$(cd "$(dirname "$QUERY_DIR")"; pwd)/$(basename "$QUERY_DIR")"
    
    if [ -f "$QUERY_DIR" ]; then
        # Single .ql file - find the qlpack root directory
        QUERY_FILE="$QUERY_DIR"
        QLPACK_DIR="$(dirname "$QUERY_DIR")"
        
        # Walk up to find qlpack.yml
        while [ "$QLPACK_DIR" != "/" ]; do
            if [ -f "$QLPACK_DIR/qlpack.yml" ] || [ -f "$QLPACK_DIR/codeql-pack.yml" ]; then
                break
            fi
            QLPACK_DIR="$(dirname "$QLPACK_DIR")"
        done
        
        if [ "$QLPACK_DIR" = "/" ]; then
            echo "${red}Error: Could not find qlpack.yml for query file${reset}"
            exit 1
        fi
        
        # Get relative path from qlpack root to query file
        QUERY_REL_PATH="${QUERY_FILE#$QLPACK_DIR/}"
        
        echo "Using qlpack at: $QLPACK_DIR"
        echo "Query: $QUERY_REL_PATH"
        
        docker run $PLATFORM_FLAG --rm \
            -v "${DATABASE_PATH}":/workspace/shared \
            -v "${QLPACK_DIR}":/workspace/queries $DOCKER_IMAGE \
            "codeql database analyze /workspace/shared/codeql-db /workspace/queries/${QUERY_REL_PATH} --format=${OUTPUT_FORMAT} --output=/workspace/shared/results.sarif"
    else
        # Directory or qlpack - mount as-is
        docker run $PLATFORM_FLAG --rm \
            -v "${DATABASE_PATH}":/workspace/shared \
            -v "${QUERY_DIR}":/workspace/queries $DOCKER_IMAGE \
            "codeql database analyze /workspace/shared/codeql-db /workspace/queries --format=${OUTPUT_FORMAT} --output=/workspace/shared/results.sarif"
    fi
else
    # Use default CodeQL queries
    docker run $PLATFORM_FLAG --rm \
        -v "${DATABASE_PATH}":/workspace/shared $DOCKER_IMAGE \
        "codeql database analyze /workspace/shared/codeql-db javascript-security-and-quality.qls githubsecuritylab/codeql-javascript-queries --format=${OUTPUT_FORMAT} --output=/workspace/shared/results.sarif --download"
fi

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
