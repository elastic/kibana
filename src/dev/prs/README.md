# Pulling a list of PRs

This folder contains files used to pull lists of Kibana PRs for release testing.  

`scripts/download_pr_list.js` is the cli wrapper.

You must have a `GITHUB_TOKEN` either set in your environment or on command line like

`GITHUB_TOKEN=<your token here> node scripts/download_pr_list.js`

Run it with `--help` or without arguments for help.

`kibana_qa_pr_list.json` is the file currently used by the Kibana QA team and also serves as an example.