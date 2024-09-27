#!/bin/bash

LANGUAGE="javascript"
CODEQL_DIR=".codeql"
DATABASE_PATH="$CODEQL_DIR/database"
QUERIES_PATH="$CODEQL_DIR/codeql-queries"
QUERY_OUTPUT="$DATABASE_PATH/results.sarif"

# Colors
bold=$(tput bold)
reset=$(tput sgr0)
red=$(tput setaf 1)
green=$(tput setaf 2)
blue=$(tput setaf 4)
yellow=$(tput setaf 3)

# Prompt for FILE_TO_ANALYZE if not set
if [ -z "$FILE_TO_ANALYZE" ]; then
    read -rp "${blue}${bold}Enter the path to the file you want to analyze: ${reset}" FILE_TO_ANALYZE
fi

if [ -f "$FILE_TO_ANALYZE" ]; then
    SOURCE_ROOT="$(dirname "$FILE_TO_ANALYZE")"
elif [ -d "$FILE_TO_ANALYZE" ]; then
    SOURCE_ROOT="$FILE_TO_ANALYZE"
else
    echo "${red}${bold}Error: The path $FILE_TO_ANALYZE is neither a file nor a directory.${reset}"
    exit 1
fi

# Prompt for SINGLE_QUERY if not set
if [ -z "$SINGLE_QUERY" ]; then
    read -rp "${blue}${bold}Enter the path to a single CodeQL query (or press Enter for default suite): ${reset}" SINGLE_QUERY
fi


mkdir -p "$CODEQL_DIR"
if ! grep -q "^$CODEQL_DIR$" .gitignore 2>/dev/null; then
    echo "$CODEQL_DIR" >> .gitignore
fi

# 1. Check if CodeQL CLI is installed
if ! command -v codeql &> /dev/null; then
    echo "${yellow}${bold}CodeQL CLI not found. Installing CodeQL CLI using Homebrew...${reset}"
    brew install codeql

    if ! command -v codeql &> /dev/null; then
        echo "${red}${bold}CodeQL CLI could not be installed via Homebrew. Exiting.${reset}"
        exit 1
    fi
else
    echo "${green}${bold}CodeQL CLI is already installed.${reset}"
fi

# 2. Clone the CodeQL queries repository
if [ ! -d "$QUERIES_PATH" ]; then
    echo "${yellow}${bold}Cloning the CodeQL query repository...${reset}"
    git clone https://github.com/github/codeql.git "$QUERIES_PATH"
else
    echo "${green}${bold}CodeQL query repository already exists. Skipping download.${reset}"
fi

# 3. Create a CodeQL database for the single file
echo "${blue}${bold}Creating CodeQL database for $FILE_TO_ANALYZE...${reset}"
mkdir -p "$DATABASE_PATH"
codeql database create "$DATABASE_PATH" --language="$LANGUAGE" --source-root="$SOURCE_ROOT" --overwrite

# 4. Determine whether to run a single query or a suite
if [ -n "$SINGLE_QUERY" ]; then
    echo "${blue}${bold}Running single CodeQL query $SINGLE_QUERY on the file...${reset}"
    codeql database analyze "$DATABASE_PATH" "$QUERIES_PATH/$SINGLE_QUERY" --format=sarifv2.1.0 --output="$QUERY_OUTPUT"
else
    echo "${blue}${bold}Running CodeQL security and quality suite for language $LANGUAGE on the single file...${reset}"
    codeql database analyze "$DATABASE_PATH" "$QUERIES_PATH/$LANGUAGE/ql/src/codeql-suites/$LANGUAGE-security-and-quality.qls" --format=sarifv2.1.0 --output="$QUERY_OUTPUT"
fi

# 5. Display the SARIF results path
echo "${green}${bold}Analysis complete. Results saved to $QUERY_OUTPUT.${reset}"

# 6. Print summary of SARIF results
if command -v jq &> /dev/null; then
    echo "${yellow}${bold}Summary of SARIF results:${reset}"
    jq -r '.runs[].results[] | "Rule: \(.ruleId)\nMessage: \(.message.text)\nFile: \(.locations[].physicalLocation.artifactLocation.uri)\nLine: \(.locations[].physicalLocation.region.startLine)\n"' "$QUERY_OUTPUT" |
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
            *)
                echo "$line"
                ;;
        esac
    done
else
    echo "${red}${bold}Please install jq to display a summary of the SARIF results.${reset}"
    echo "${bold}You can view the full results in the SARIF file using a SARIF viewer.${reset}"
fi
