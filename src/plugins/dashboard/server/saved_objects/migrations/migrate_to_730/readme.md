## Legacy Pre 7.3 Migrations

This folder contains legacy migrations that migrate dashboard saved object from any previous version into Kibana 7.3.0. The migrations in this folder need to be able to handle state from any older version of dashboard from as early as 5.0 because Saved Object Migrations did not exist, and in-place migrations were used instead. After 7.3.0, saved object migrations are in place, so it can be assumed that any saved migration that is registered there will receive state from the version before.
