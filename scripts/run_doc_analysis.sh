#!/bin/bash
# Documentation Analysis Runner
# Allows you to run any of the three documentation analysis approaches

echo "=== Kibana Documentation Analysis Runner ==="
echo ""
echo "Choose an analysis approach:"
echo "1) Basic Analysis (JavaScript) - Balanced detail and performance"
echo "2) Shell Analysis (Bash) - Fastest execution"
echo "3) Advanced Analysis (JavaScript) - Most comprehensive"
echo "4) Run all approaches"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "=== Running Basic Analysis (JavaScript) ==="
        echo ""
        node scripts/analyze_documentation.js
        ;;
    2)
        echo ""
        echo "=== Running Shell Analysis (Bash) ==="
        echo ""
        ./scripts/doc_analysis.sh
        ;;
    3)
        echo ""
        echo "=== Running Advanced Analysis (JavaScript) ==="
        echo ""
        node scripts/advanced_doc_analysis.js
        ;;
    4)
        echo ""
        echo "=== Running All Approaches ==="
        echo ""
        echo "--- 1. Basic Analysis ---"
        node scripts/analyze_documentation.js
        echo ""
        echo "--- 2. Shell Analysis ---"
        ./scripts/doc_analysis.sh
        echo ""
        echo "--- 3. Advanced Analysis ---"
        node scripts/advanced_doc_analysis.js
        ;;
    *)
        echo "Invalid choice. Please run the script again and choose 1-4."
        exit 1
        ;;
esac

echo ""
echo "=== Analysis Complete ==="
