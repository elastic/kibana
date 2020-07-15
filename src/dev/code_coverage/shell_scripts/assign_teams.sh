#!/bin/bash

echo "### Code Coverage Team Assignment"
echo ""

PIPELINE_NAME=$1
export PIPELINE_NAME

node scripts/load_team_assignment.js --verbose

echo "###  Code Coverage Team Assignment - Complete"
echo ""
