# @kbn/dependency-ownership

A CLI tool for analyzing package ownership.

---

## Table of Contents
1. [Show all packages owned by a specific team](#show-all-packages-owned-by-a-specific-team)
2. [Show who owns specific dependency](#show-who-owns-specific-dependency)
3. [List all dependencies with without owner](#list-all-dependencies-with-without-owner)
4. [Generate dependency ownership report](#generate-dependency-ownership-report)

---


### 1. Show all packages owned by a specific team

Use this command to list all packages or plugins within a directory that use a specified dependency.

```sh
node scripts/dependency_ownership -o <owner>
```
or
```sh
node scripts/dependency_ownership --owner <owner>
```

**Example**:
```sh
node scripts/dependency_ownership -o @elastic/kibana-core
```

- `-o @elastic/kibana-core`: Specifies the team.

**Output**: Lists dev and prod dependencies.

```json
{
  "prodDependencies": [
    "<dependency_1>",
    "<dependency_2>",
    "<dependency_3>",
    //...
  ],
  "devDependencies": [
    "<dependency_1>",
    "<dependency_2>",
    //...
  ]
}
```

---

### 2. Show who owns specific dependency

Get the owner for a specific dependency.

```sh
node scripts/dependency_ownership -d <dependency>
```
or
```sh
node scripts/dependency_ownership --dependency <dependency>
```

**Example**:
```sh
node scripts/dependency_ownership -d rxjs
```

- `-d rxjs`: Specifies the dependency.

**Output**: Lists owners for `rxjs`.
```json
[
  "@elastic/kibana-core"
]
```
---

### 3. List all dependencies with without owner

To display all dependencies that do not have owner defined.

```sh
node scripts/dependency_ownership --missing-owner
```

**Example**:
```sh
node scripts/dependency_ownership --missing-owner
```

**Output**: Lists all dev and prod dependencies without owner.

```json
{
  "prodDependencies": [
    "<dependency_1>",
    "<dependency_2>",
    //...
  ],
  "devDependencies": [
    "<dependency_1>",
    "<dependency_2>",
    //...
  ]
}
```

---

### 4. Generate dependency ownership report

Generates a comprehensive report with all dependencies with and without owner.

```sh
node scripts/dependency_ownership --missing-owner
```

**Example**:
```sh
node scripts/dependency_ownership --missing-owner
```

**Output**: Lists all covered dev and prod dependencies, uncovered dev and prod dependencies, dependencies aggregated by owner.

```json
{
  "coveredProdDependencies": [ // Prod dependencies with owner
    "<dependency_1>",
    "<dependency_2>",
    //...
  ],
  "coveredDevDependencies": [ // Dev dependencies with owner
    "<dependency_1>",
    "<dependency_2>",
    //...
  ],
  "uncoveredProdDependencies": [ // Prod dependencies without owner
    "<dependency_1>",
    "<dependency_2>",
    //...
  ],
  "uncoveredDevDependencies": [ // Dev dependencies without owner
    "<dependency_1>",
    "<dependency_2>",
    //...
  ],
  "prodDependenciesByOwner": { // Prod dependencies aggregated by owner
    "@elastic/team_1": ["<dependency_1>"],
    "@elastic/team_2": ["<dependency_1>"],
  },
  "devDependenciesByOwner": { // Dev dependencies aggregated by owner
    "@elastic/team_1": ["<dependency_1>"],
    "@elastic/team_2": ["<dependency_1>"],
  },
}
```


---

For further information on additional flags and options, refer to the script's help command.

