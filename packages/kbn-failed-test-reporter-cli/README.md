# @kbn/failed-test-reporter-cli

CLI tool for reporting failed test information in Kibana CI. This package provides utilities for collecting, analyzing, and reporting failed test data from continuous integration runs.

## Overview

Command-line tool for processing and reporting failed test information from CI builds, helping identify flaky tests and test stability issues in the Kibana development process.

## Package Details

- **Package Type**: Development tool
- **Purpose**: Failed test reporting and analysis
- **Integration**: Used in CI/CD pipelines for test monitoring

## Usage

```bash
# Report failed tests from CI run
yarn kbn failed-test-reporter --build-url https://ci.elastic.co/build/12345
```
