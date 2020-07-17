#!/bin/bash

echo "### Code Coverage Team Assignment"
echo ""

PIPELINE_NAME=$1
export PIPELINE_NAME

ES_HOST="https://${USER_FROM_VAULT}:${PASS_FROM_VAULT}@${HOST_FROM_VAULT}"
export ES_HOST

node scripts/load_team_assignment.js --verbose

echo "###  Code Coverage Team Assignment - Complete"
echo ""
