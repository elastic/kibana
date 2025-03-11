# @kbn/relocate

This package contains a CLI tool to help move modules (plugins and packages) into their intended folders, according to the _Sustainable Kibana Architecture.

## Prerequisites

You must have `gh` CLI tool installed. You can install it by running:

```sh
brew install gh
gh auth login
```

## Usage

First of all, you need to decide whether you want to contribute to an existing PR or to create a new one. Use the `--pr` flag to specify the PR you are trying to update:

```sh
node scripts/relocate --pr <prNumber>
```

Note that when specifying an existing PR, the logic will undo + rewrite history for that PR, by force-pushing changes.

To relocate modules for a given team, identify the "team handle" (e.g. @elastic/kibana-core), and run the following command from the root of the Kibana repo:

```sh
node scripts/relocate --pr <prNumber> --team <team_handle>
```

You can relocate modules by path, e.g. all modules that are under `x-pack/plugins/observability_solution/`:

```sh
node scripts/relocate --pr <prNumber> --path "x-pack/plugins/observability_solution/"
```

You can specify indivual packages by ID:

```sh
node scripts/relocate --pr <prNumber> --include "@kbn/data-forge" --include "@kbn/deeplinks-observability"
```

You can also specify combinations of the above filters, to include modules that match ANY of the criteria.
Excluding modules explictly is also supported:

```sh
node scripts/relocate --pr <prNumber> --team "@elastic/obs-ux-management-team" --exclude "@kbn/data-forge"
```

## Details

The script generates log / description files of the form `relocate_YYYYMMDDhhmmss_<type>.out`. You can inspect them if you encounter any errors.

In particular, the file `relocate_YYYYMMDDhhmmss_description.out` contains the auto-generated PR description. You can push it to the PR by running:

```sh
gh pr edit <prNumber> -F relocate_YYYYMMDDhhmmss_description.out -R elastic/kibana
```
