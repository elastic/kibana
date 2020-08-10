#!/bin/bash

echo "### Generate Code Owners"
echo ""

CODEOWNERS_PATH=$1

node scripts/generate_code_owners.js --verbose --codeOwnersPath $CODEOWNERS_PATH

echo ""
echo "### Generate Code Owners - Complete"
echo ""
