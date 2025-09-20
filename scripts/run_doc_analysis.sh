#!/bin/bash
# Documentation Analysis Runner
# Allows you to run any of the three documentation analysis approaches

# Help functionality
show_help() {
  cat << 'EOF'

Kibana Documentation Analysis Runner

DESCRIPTION:
  Interactive runner for all three documentation analysis approaches.
  Helps you choose the right analysis tool for your needs.

USAGE:
  ./scripts/run_doc_analysis.sh [options]

OPTIONS:
  -h, --help     Show this help message
  -v, --verbose  Run selected analysis with verbose output

AVAILABLE ANALYSIS APPROACHES:
  1) Basic Analysis (JavaScript)
     • Balanced detail and performance with quality scoring
     • ~30-60 seconds execution time
     • Quality scoring (Low/Medium/High)
     • Good for regular analysis

  2) Shell Analysis (Bash)
     • Fastest execution using native shell commands
     • ~5-10 seconds execution time
     • Quick overview with accurate package counts
     • Best for rapid assessment

  3) Advanced Analysis (JavaScript)
     • Most comprehensive with detailed content parsing
     • ~1-2 minutes execution time
     • Package categorization and feature analysis
     • Best for deep analysis and reporting

INDIVIDUAL SCRIPT USAGE:
  # Run scripts directly with help
  node scripts/analyze_documentation.js --help
  node scripts/advanced_doc_analysis.js --help
  ./scripts/doc_analysis.sh --help

  # Run with verbose output
  node scripts/analyze_documentation.js --verbose
  node scripts/advanced_doc_analysis.js --verbose
  ./scripts/doc_analysis.sh --verbose

EXAMPLES:
  # Interactive menu
  ./scripts/run_doc_analysis.sh

  # Interactive menu with verbose output
  ./scripts/run_doc_analysis.sh --verbose

EOF
}

# Parse command line arguments
verbose=false
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -v|--verbose)
      verbose=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

verbose_flag=""
if [ "$verbose" = true ]; then
  verbose_flag="--verbose"
fi

echo "=== Kibana Documentation Analysis Runner ==="
echo ""
echo "Choose an analysis approach:"
echo "1) Basic Analysis (JavaScript) - Balanced detail and performance"
echo "2) Shell Analysis (Bash) - Fastest execution"
echo "3) Advanced Analysis (JavaScript) - Most comprehensive"
echo "4) Run all approaches"
echo "5) Show help for individual scripts"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "=== Running Basic Analysis (JavaScript) ==="
        echo ""
        node scripts/analyze_documentation.js $verbose_flag
        ;;
    2)
        echo ""
        echo "=== Running Shell Analysis (Bash) ==="
        echo ""
        ./scripts/doc_analysis.sh $verbose_flag
        ;;
    3)
        echo ""
        echo "=== Running Advanced Analysis (JavaScript) ==="
        echo ""
        node scripts/advanced_doc_analysis.js $verbose_flag
        ;;
    4)
        echo ""
        echo "=== Running All Approaches ==="
        echo ""
        echo "--- 1. Basic Analysis ---"
        node scripts/analyze_documentation.js $verbose_flag
        echo ""
        echo "--- 2. Shell Analysis ---"
        ./scripts/doc_analysis.sh $verbose_flag
        echo ""
        echo "--- 3. Advanced Analysis ---"
        node scripts/advanced_doc_analysis.js $verbose_flag
        ;;
    5)
        echo ""
        echo "=== Individual Script Help ==="
        echo ""
        echo "For detailed help on each script, run:"
        echo "  node scripts/analyze_documentation.js --help"
        echo "  node scripts/advanced_doc_analysis.js --help"
        echo "  ./scripts/doc_analysis.sh --help"
        echo ""
        echo "Or run this script with --help for overall information:"
        echo "  ./scripts/run_doc_analysis.sh --help"
        ;;
    *)
        echo "Invalid choice. Please run the script again and choose 1-5."
        exit 1
        ;;
esac

echo ""
echo "=== Analysis Complete ==="
