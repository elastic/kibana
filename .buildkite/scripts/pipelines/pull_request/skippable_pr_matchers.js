/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  SKIPPABLE_PR_MATCHERS: [
    /^docs\//,
    /^rfcs\//,
    /^.ci\/.+\.yml$/,
    /^.ci\/es-snapshots\//,
    /^.ci\/pipeline-library\//,
    /^.ci\/Jenkinsfile_[^\/]+$/,
    /^\.github\//,
    /\.md$/,
    /^\.backportrc\.json$/,
    /^nav-kibana-dev\.docnav\.json$/,
    /^src\/dev\/prs\/kibana_qa_pr_list\.json$/,
    /^\.buildkite\/scripts\/pipelines\/pull_request\/skippable_pr_matchers\.js$/,
  ],
};
