# Summary

Saved Objects CLI tool that can be used to check whether a snapshot of current
mappings (i.e., mappings on main) is compatible with mappings we can extract
from the current code.

## `check`

The command that runs the compatibility check

## `generateSnapshot`

Run this command to extract mappings as an JS object from plugins code and
then write to a JSON file for use in the `check` command.


