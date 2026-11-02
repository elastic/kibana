# README

This folder contains the language definitions for XJSON used by the Monaco editor.

## Summary of contents

Note: All source code.

### ./worker

The worker proxy and worker instantiation code used in both the main thread and the worker thread.

### ./lexer_rules

Contains the Monarch-specific language tokenization rules for XJSON. Each set of rules registers itself against monaco.

### ./constants.ts

Contains the unique language ID.

### ./language

Takes care of global setup steps for the language (like registering it against Monaco) and exports a way to load up
the grammar parser.

### ./worker_proxy_service

A stateful mechanism for holding a reference to the Monaco-provided proxy getter.
