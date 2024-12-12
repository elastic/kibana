
# @kbn/dependency-usage

A CLI tool for analyzing dependencies across packages and plugins. This tool provides commands to check dependency usage, aggregate it, debug dependency graphs, and more.

---

## Table of Contents
1. [Show all packages/plugins using a dependency](#show-all-packagesplugins-using-a-dependency)
2. [Show dependencies grouped by code owner](#show-dependencies-grouped-by-code-owner)
3. [List all dependencies for a package or directory](#list-all-dependencies-for-source-directory)
4. [Group by code owner with adjustable collapse depth](#group-by-code-owner-with-adjustable-collapse-depth)
5. [Show dependencies matching a pattern](#show-dependencies-matching-a-pattern)
6. [Verbose flag to debug dependency graph issues](#verbose-flag-to-debug-dependency-graph-issues)

---


### 1. Show all packages/plugins using a specific dependency

Use this command to list all packages or plugins within a directory that use a specified dependency.

```sh
bash scripts/dependency_usage.sh -d <dependency> -p <path_to_directory>
```
or
```sh
bash scripts/dependency_usage.sh --dependency-name <dependency> --paths <path_to_directory>
```

**Example**:
```sh
bash scripts/dependency_usage.sh -d rxjs -p x-pack/plugins/security_solution
```

- `-d rxjs`: Specifies the dependency to look for (`rxjs`).
- `-p x-pack/plugins/security_solution`: Sets the directory to search within (`x-pack/plugins/security_solution`).

---

### 2. Show dependencies grouped by code owner

Group the dependencies used within a directory by code owner.

```sh
bash scripts/dependency_usage.sh -p <path_to_directory> -g owner
```
or
```sh
bash scripts/dependency_usage.sh --paths <path_to_directory> --group-by owner
```

**Example**:
```sh
bash scripts/dependency_usage.sh -p x-pack/plugins -g owner
```

- `-p x-pack/plugins`: Sets the directory to scan for plugins using this dependency.
- `-g owner`: Groups results by code owner.
- **Output**: Lists all dependencies for `x-pack/plugins`, organized by code owner.

---

### 3. List all dependencies for source directory

To display all dependencies used within a specific directory.

```sh
bash scripts/dependency_usage.sh -p <path_to_directory>
```
or
```sh
bash scripts/dependency_usage.sh --paths <path_to_directory>
```

**Example**:
```sh
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution
```

- `-p x-pack/plugins/security_solution`: Specifies the package or directory for which to list all dependencies.
- **Output**: Lists all dependencies for `x-pack/plugins/security_solution`.

---

### 4. Group by code owner with adjustable collapse depth

When a package or plugin has multiple subteams, use the `--collapse-depth` option to control how granular the grouping by code owner should be.

#### Detailed Subteam Grouping
Shows all subteams within `security_solution`.

```sh
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution -g owner --collapse-depth 4
```

#### Collapsed Grouping
Groups the results under a higher-level owner (e.g., `security_solution` as a single group).

```sh
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution -g owner --collapse-depth 1
```

**Explanation**:
- `-p x-pack/plugins/security_solution`: Specifies the directory to scan.
- `-g owner`: Groups results by code owner.
- `--collapse-depth`: Defines the depth for grouping, where higher numbers show more granular subteams.
- **Output**: Lists dependencies grouped by code owner at different levels of depth based on the `--collapse-depth` value.

---

### 5. Show dependencies matching a pattern

Search for dependencies that match a specific pattern (such as `react-*`) within a package and output the results to a specified file.

```sh
bash scripts/dependency_usage.sh -p <path_to_directory> -d '<pattern>' -o <output_file>
```

**Example**:
```sh
bash scripts/dependency_usage.sh -d 'react-*' -p x-pack/plugins/security_solution -o ./tmp/results.json
```

- `-p x-pack/plugins/security_solution`: Specifies the directory or package to search within.
- `-d 'react-*'`: Searches for dependencies that match the pattern `react-*`.
- `-o ./tmp/results.json`: Outputs the results to a specified file (`results.json` in the `./tmp` directory).
- **Output**: Saves a list of all dependencies matching `react-*` in `x-pack/plugins/security_solution` to `./tmp/results.json`.

---

### 6. Verbose flag to debug dependency graph issues

Enable verbose mode to log additional details for debugging dependency graphs. This includes generating a non-aggregated dependency graph in `.dependency-graph-log.json`.

```sh
bash scripts/dependency_usage.sh -p <path_to_directory> -o <output_file> -v
```

**Example**:
```sh
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution -o ./tmp/results.json
```
- `-p x-pack/plugins/security_solution`: Specifies the target directory or package to analyze.
- `-o ./tmp/results.json`: Saves the output to the `results.json` file in the `./tmp` directory.
- `-v`: Enables verbose mode.

**Output**: Saves a list of all dependencies in `x-pack/plugins/security_solution` to `./tmp/results.json`. Additionally, it logs a detailed, non aggregated dependency graph to `.dependency-graph-log.json` for debugging purposes.

---

For further information on additional flags and options, refer to the script's help command.

