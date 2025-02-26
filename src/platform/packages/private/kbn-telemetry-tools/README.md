# Telemetry Tools

## Schema extraction tool

### Description

The tool is used to extract telemetry collectors schema from all `*.{ts}` files in provided plugins directories to JSON files. The tool looks for `.telemetryrc.json` files in the root of the project and in the `x-pack` dir for its runtime configurations.

It uses typescript parser to build an AST for each file. The tool is able to validate, extract and match collector schemas.

### Examples and restrictions

**Global restrictions**:

The `id` can be only a string literal, it cannot be a template literals w/o expressions or string-only concatenation expressions or anything else.

```
export const myCollector = makeUsageCollector<Usage>({
  type: 'string_literal_only',
  ...
});
```

### Usage

```bash
node scripts/telemetry_extract.js
```

This command has no additional flags or arguments. The `.telemetryrc.json` files specify the path to the directory where searching should start, output json files, and files to exclude.


### Output


The generated JSON files contain an ES mapping for each schema. This mapping is used to verify changes in the collectors and as the basis to map those fields into the external telemetry cluster.

**Example**:

```json
{
  "properties": {
    "cloud": {
      "properties": {
        "isCloudEnabled": {
          "type": "boolean"
        }
      }
    }
  }
}
```

## Schema validation tool

### Description

The tool performs a number of checks on all telemetry collectors and verifies the following:

1. Verifies the collector structure, fields, and returned values are using the appropriate types.
2. Verifies that the collector `fetch` function Type matches the specified `schema` in the collector.
3. Verifies that the collector `schema` matches the stored json schema .

### Notes

We don't catch every possible misuse of the collectors, but only the most common and critical ones.

What will not be caught by the validator:

* Mistyped SavedObject/CallCluster return value. Since the hits returned from ES can be typed to anything without any checks. It is advised to add functional tests that grabs the schema json file and checks that the returned usage matches the types exactly. 

* Fields in the schema that are never collected. If you are trying to report a field from ES but that value is never stored in ES, the check will not be able to detect if that field is ever collected in the first palce. It is advised to add unit/functional tests to check that all the fields are being reported as expected.

The tool looks for `.telemetryrc.json` files in the root of the project and in the `x-pack` dir for its runtime configurations.

Currently auto-fixer (`--fix`) can automatically fix the json files with the following errors:

* incompatible schema - this error means that the collector schema was changed but the stored json schema file was not updated.

* unused schemas - this error means that a collector was removed or its `type` renamed, the json schema file contains a schema that does not have a corrisponding collector.

### Usage

```bash
node scripts/telemetry_check --fix
```

* `--path` specifies a collector path instead of checking all collectors specified in the `.telemetryrc.json` files. Accepts a `.ts` file. The file must be discoverable by at least one rc file.
* `--fix` tells the tool to try to fix as many violations as possible. All errors that tool won't be able to fix will be reported.
