#!/bin/bash

echo "### Code Coverage Team Assignment"
echo ""

CURRENT_TEAM_ASSIGN_PATH=$1

node scripts/load_team_assignment.js --verbose --jsonPath ${CURRENT_TEAM_ASSIGN_PATH}

echo "###  Code Coverage Team Assignment - Complete"
echo ""
