#!/bin/bash

# Script to extract Console-specific translation messages from Kibana translation files
# and create new files with only "console." prefixed messages for the packaged Console.

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the source translations directory (resolve relative path)
SOURCE_TRANSLATIONS_DIR="$(realpath "$SCRIPT_DIR/../../../../../../../x-pack/platform/plugins/private/translations/translations")"

# Output directory for Console-specific translations (in react folder)
OUTPUT_DIR="$(realpath "$SCRIPT_DIR/../react/translations")"

echo "=== Extracting Console translation messages..."
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_TRANSLATIONS_DIR" ]; then
    echo "Error: Source translations directory not found: $SOURCE_TRANSLATIONS_DIR"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Find all JSON files in source directory (portable approach)
files=($(find "$SOURCE_TRANSLATIONS_DIR" -name "*.json" -type f -exec basename {} \;))

if [ ${#files[@]} -eq 0 ]; then
    echo "Error:  No translation files found in source directory"
    exit 0
fi

# Function to extract console messages from a JSON file
extract_console_messages() {
    local source_file="$1"
    local output_file="$2"
    local filename=$(basename "$source_file")

    echo "Processing $filename..."

    # Skip en.json as it might use JavaScript object syntax that's hard to parse
    if [ "$filename" = "en.json" ]; then
        echo "Warning: Skipping en.json (uses JavaScript object syntax)"
        return
    fi

    source_content="$source_file"

    # Extract console messages and formats using jq
    if command -v jq >/dev/null 2>&1; then
        # Extract console messages (keys starting with "console.")
        console_messages=$(jq '
            if has("messages") then .messages else . end |
            with_entries(select(.key | startswith("console.")))
        ' "$source_content")

        # Extract formats if they exist
        formats=$(jq 'if has("formats") then .formats else {} end' "$source_content")

        # Create output structure
        jq -n \
            --argjson formats "$formats" \
            --argjson messages "$console_messages" \
            '{formats: $formats, messages: $messages}' > "$output_file"

        # Count messages
        message_count=$(echo "$console_messages" | jq 'keys | length')
        echo "Processed $filename: extracted $message_count console messages"

    else
        echo "Error: jq is required but not installed. Please install jq to run this script."
        exit 1
    fi

    # Clean up temp file if it was created
    if [ "$filename" = "en.json" ] && [ -f "/tmp/temp_en.json" ]; then
        rm "/tmp/temp_en.json"
    fi
}

# Process each translation file
for file in "${files[@]}"; do
    source_file="$SOURCE_TRANSLATIONS_DIR/$file"
    output_file="$OUTPUT_DIR/$file"
    extract_console_messages "$source_file" "$output_file"
done


echo ""
echo "=== Successfully extracted Console translations ==="
echo "Translations located at: $OUTPUT_DIR"
echo ""
echo "=== Files created ==="

# List created files with message counts
for file in "$OUTPUT_DIR"/*.json; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if command -v jq >/dev/null 2>&1; then
            message_count=$(jq '.messages | keys | length' "$file")
            echo "   - $filename ($message_count messages)"
        else
            echo "   - $filename"
        fi
    fi
done
