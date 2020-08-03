#!/bin/bash

echo "### Define Code Owners"
echo ""

CODEOWNERS_PATH=$1
export CODEOWNERS_PATH

node scripts/canonical_codeowners.js --verbose

echo "### Define Code Owners - Complete"
echo ""
