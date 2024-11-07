# @kbn/dependency-usage

#### 1. Show all packages/plugins within a directory that use a specific dependency

```sh
bash scripts/dependency_usage.sh -d rxjs -p x-pack/plugins/security_solution
```
or

```sh
bash scripts/dependency_usage.sh --dependency-name rxjs --paths x-pack/plugins/security_solution
```

**Example**:
- `-d rxjs`: Specifies the dependency to look for (`rxjs`).
- `-p x-pack/plugins/security_solution`: Sets the directory to search within (`x-pack/plugins/security_solution`).

#### 2. Show all packages/plugins within a directory grouped by code owner

Use this command to find all packages or plugins within a directory that include a specific dependency, grouped by code owner.

```sh
bash scripts/dependency_usage.sh -d rxjs -p x-pack/plugins -g owner
```
or
```sh
bash scripts/dependency_usage.sh --dependency-name rxjs --paths x-pack/plugins --group-by owner
```

**Explanation**:
- `-d rxjs`: Specifies the dependency to search for (`rxjs`).
- `-p x-pack/plugins`: Sets the directory to scan for plugins using this dependency.
- `-g owner`: Groups results by code owner.
- **Output**: Lists plugins within `x-pack/plugins` that use `rxjs`, organized by code owner.

---

#### 3. Show all dependencies for a specific package/plugin or directory

Use this command to display all dependencies used within a specific package, plugin, or directory.

```sh
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution
```
or
```sh
bash scripts/dependency_usage.sh --paths x-pack/plugins/security_solution
```

**Explanation**:
- `-p x-pack/plugins/security_solution`: Specifies the package or directory for which to list all dependencies.
- **Output**: Lists all dependencies for `x-pack/plugins/security_solution`.

---

#### 4. Group by code owner with adjustable collapse depth for fine-grained grouping

When a package or plugin has multiple subteams, adjust the `--collapse-depth` option to define how granular or the grouping by code owner should be.

**Detailed Subteam Grouping**:
Shows all subteams within `security_solution`.

```sh
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution -g owner --collapse-depth 4
```

**Collapsed Grouping**:
Groups the results under a higher-level owner (e.g., `security_solution` as a single group).

```bash
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution -g owner --collapse-depth 1
```

**Explanation**:
- `-p x-pack/plugins/security_solution`: Specifies the directory to scan.
- `-g owner`: Groups results by code owner.
- `--collapse-depth`: Defines the depth for grouping, where higher numbers show more granular subteams.
- **Output**: Lists dependencies grouped by code owner at different levels of depth based on the `--collapse-depth` value.

---

#### 5. Show all dependencies matching a pattern (e.g., `react-*`) within a package

Use this command to search for dependencies that match a specific pattern (such as `react-*`) within a package, and output the results to a specified file.

```bash
bash scripts/dependency_usage.sh -p x-pack/plugins/security_solution -d 'react-*' -o ./tmp/results.json
```

**Explanation**:
- `-p x-pack/plugins/security_solution`: Specifies the directory or package to search within.
- `-d 'react-*'`: Searches for dependencies that match the pattern `react-*`.
- `-o ./tmp/results.json`: Outputs the results to a specified file (`results.json` in the `./tmp` directory).
- **Output**: Saves a list of all dependencies matching `react-*` in `x-pack/plugins/security_solution` to `./tmp/results.json`.

---

### Using `madge` for building dependency graph
Added for comparison. Supports only full scan for third-party dependencies, no proper groping by codeowner/package.

By default, Madge outputs paths relative to the `baseDir`, which can vary depending on how you run the command or set the directory structure. There are multiple problems with that:
1. `baseDir` set to `.` results in empty graph
2. Having paths that are relative makes it challenging to perform reliable lookups or aggregations, i. e. grouping by codeowners

#### Show all dependencies

```sh
bash scripts/dependency_usage.sh -p x-pack/plugins -o ./tmp/deps-result-madge.json -t madge
```

# Dependency cruiser vs Madge perf stats

| Analysis                                | Real Time   | User Time   | Sys Time   |
|-----------------------------------------|-------------|-------------|------------|
| All plugins (dependency-cruiser)        | 7m 21.126s  | 7m 53.099s  | 20.581s    |           
| All plugins (madge)                     | 4m 38.998s  | 4m 26.131s  | 39.043s    |           
| Single plugin (dependency-cruiser)      | 31.360s     | 45.352s     | 2.208s     |           
| Single plugin (madge)                   | 1m 8.398s   | 1m 14.524s  | 11.065s    |           
| Multiple plugins (dependency-cruiser)   | 36.403s     | 50.563s     | 2.814s     |           
| Multiple plugins (madge)                | 1m 11.620s  | 1m 18.473s  | 11.334s    |
| x-pack/packages (dependency-cruiser)    | 6.638s      | 12.646s     | 0.654s     |
| x-pack/packages (madge)                 | 9.148s      | 10.827s     | 1.425s     |
| packages (dependency-cruiser)           | 25.744s     | 39.073s     | 2.191s     |
| packages (madge)                        | 16.299s     | 22.242s     | 2.235s     |
