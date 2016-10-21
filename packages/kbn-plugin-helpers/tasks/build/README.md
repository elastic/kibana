Copies files from the source into a zip archive that can be distributed for
installation into production kibana installs. The archive includes the non-
development npm dependencies and builds itself using raw files in the source
directory so make sure they are clean/up to date. The resulting archive can
be found at:

```
build/{pkg.name}-{pkg.version}.zip
```
