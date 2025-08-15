<!--->
Copilot prompt: What does the capture_oas_snapshot.js script do. I want to know how it work, what code it calls, what the code it calls does and how that relates to the `oas_docs` 

Context: codebase (tool), kbn-capture-oas-snapshot-cli (folder), oas_docs (folder), capture_oas_snapshot.js (file)

Mode: ask

Model: Claude Sonnet 3.7 thinking
<--->
# Capture OAS Snapshot Script Explanation

The [`scripts/capture_oas_snapshot.js`](../scripts/capture_oas_snapshot.js) script is an entry point for generating OpenAPI Specification (OAS) snapshots of Kibana's APIs. Here's how it works:

## Script Structure

```javascript
require('../src/setup_node_env');
require('@kbn/capture-oas-snapshot-cli');
```

This script:
1. Sets up the Node.js environment
2. Loads and runs the `@kbn/capture-oas-snapshot-cli` package

## Behind the Scenes

When you run `node scripts/capture_oas_snapshot [options]`, it executes the following workflow:

1. The CLI package (`@kbn/capture-oas-snapshot-cli`) parses command-line arguments through the [`packages/kbn-capture-oas-snapshot-cli/src/run_capture_oas_snapshot_cli.ts`](../packages/kbn-capture-oas-snapshot-cli/src/run_capture_oas_snapshot_cli.ts) module, which accepts flags like:
   - `--serverless` / `--traditional`: Which Kibana build flavors to capture
   - `--update`: Whether to update existing files
   - `--include-path`: API paths to include
   - `--exclude-path`: API paths to exclude

2. For each enabled build flavor, it calls the [`captureOasSnapshot()`](../packages/kbn-capture-oas-snapshot-cli/src/capture_oas_snapshot.ts) function from [`packages/kbn-capture-oas-snapshot-cli/src/capture_oas_snapshot.ts`](../packages/kbn-capture-oas-snapshot-cli/src/capture_oas_snapshot.ts) with the appropriate parameters, including output file paths:
   - Traditional Kibana: [`oas_docs/bundle.json`](bundle.json)
   - Serverless Kibana: [`oas_docs/bundle.serverless.json`](bundle.serverless.json)

3. The [`captureOasSnapshot()`](../packages/kbn-capture-oas-snapshot-cli/src/capture_oas_snapshot.ts) function:
   - Starts an Elasticsearch cluster appropriate for the build flavor
   - Launches a Kibana instance connected to that cluster
   - Fetches the OpenAPI specifications from the running Kibana's `/api/oas` endpoint
   - Formats and saves the specifications to the specified output file
   - Shuts down the temporary services

## Relation to oas_docs

This script is Step 0 in a multi-step workflow for producing the final Kibana API documentation:

1. **Generation**: [`scripts/capture_oas_snapshot.js`](../scripts/capture_oas_snapshot.js) extracts API definitions and saves them to:
   - [`oas_docs/bundle.json`](bundle.json) (traditional)
   - [`oas_docs/bundle.serverless.json`](bundle.serverless.json) (serverless)

2. **Merging**: Scripts in [`oas_docs/scripts`](scripts) merge these base bundles with other OpenAPI bundles

3. **Enhancement**: Overlays and examples from [`oas_docs/overlays`](overlays) and [`oas_docs/examples`](examples) are applied

4. **Output**: The final production-ready OpenAPI bundles are created in [`oas_docs/output`](output):
   - `kibana.yaml` for traditional Kibana
   - `kibana.serverless.yaml` for serverless Kibana

These final bundles are used to generate the official [Kibana API reference documentation](https://www.elastic.co/docs/api/doc/kibana).

# OAS Linting Process and Customization

Based on examining the repository structure, the linters in [`oas_docs/linters`](oas_docs/linters ) directory are primarily used during the OpenAPI specification generation process. Here's how they fit into the workflow:

## When Linters Are Used

The linters (particularly Spectral, as indicated by the `.spectral.yaml` file) are likely invoked:

1. After the initial OAS bundle generation
2. Before producing the final output files in [`oas_docs/output`](oas_docs/output )
3. Most likely through targets in the `makefile` located in the [`oas_docs`](oas_docs ) directory

## How Linters Are Run

The linting process is probably:
1. Defined as a target in the `makefile`
2. Configured by the `.spectral.yaml` file that defines validation rules
3. Applied to the merged and enhanced OpenAPI bundles before final output

## Extending the Linting Process

Yes, you can extend the linting process to include custom guidelines. Here are approaches you could take:

1. **Modify Spectral Rules**:
   - Edit the `.spectral.yaml` file to add custom rules that validate against your guidelines
   - Spectral supports custom functions that can check for specific patterns or requirements

2. **Create Custom Linting Scripts**:
   - Add a new script in the [`oas_docs/scripts`](oas_docs/scripts ) directory that applies your custom guidelines
   - Integrate your script into the existing workflow by modifying the `makefile`

3. **Add a Post-Processing Step**:
   - Create a script that processes the output files after standard linting
   - Add your script as a new step in the `makefile`

For a thorough approach, I recommend examining the `makefile` contents to understand the exact linting commands and integration points, which would allow for more precise customization.
