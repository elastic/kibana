/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function link(text: string, url: string) {
  return `<a href="${url}">${text}</a>`;
}

function getLinkForGPCTLNonProd(commit: string) {
  return `https://overview.qa.cld.elstc.co/app/dashboards#/view/serverless-tooling-gpctl-deployment-status?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1d,to:now))&service-name=kibana&_a=(controlGroupInput:(chainingSystem:HIERARCHICAL,controlStyle:oneLine,ignoreParentSettings:(ignoreFilters:!f,ignoreQuery:!f,ignoreTimerange:!f,ignoreValidations:!f),panels:('18201b8e-3aae-4459-947d-21e007b6a3a5':(explicitInput:(dataViewId:'serverless.logs-*',enhancements:(),fieldName:commit-hash,id:'18201b8e-3aae-4459-947d-21e007b6a3a5',selectedOptions:!('${commit}'),title:commit-hash),grow:!t,order:1,type:optionsListControl,width:medium),'41060e65-ce4c-414e-b8cf-492ccb19245f':(explicitInput:(dataViewId:'serverless.logs-*',enhancements:(),fieldName:service-name,id:'41060e65-ce4c-414e-b8cf-492ccb19245f',selectedOptions:!(kibana),title:service-name),grow:!t,order:0,type:optionsListControl,width:medium),ed96828e-efe9-43ad-be3f-0e04218f79af:(explicitInput:(dataViewId:'serverless.logs-*',enhancements:(),fieldName:to-env,id:ed96828e-efe9-43ad-be3f-0e04218f79af,selectedOptions:!(qa),title:to-env),grow:!t,order:2,type:optionsListControl,width:medium))))`;
}

function getLinkForGPCTLProd(commit: string) {
  return `https://overview.elastic-cloud.com/app/dashboards#/view/serverless-tooling-gpctl-deployment-status?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-1d,to:now))&service-name=kibana&_a=(controlGroupInput:(chainingSystem:HIERARCHICAL,controlStyle:oneLine,ignoreParentSettings:(ignoreFilters:!f,ignoreQuery:!f,ignoreTimerange:!f,ignoreValidations:!f),panels:('18201b8e-3aae-4459-947d-21e007b6a3a5':(explicitInput:(dataViewId:'serverless.logs-*',enhancements:(),fieldName:commit-hash,id:'18201b8e-3aae-4459-947d-21e007b6a3a5',selectedOptions:!('${commit}'),title:commit-hash),grow:!t,order:1,type:optionsListControl,width:medium),'41060e65-ce4c-414e-b8cf-492ccb19245f':(explicitInput:(dataViewId:'serverless.logs-*',enhancements:(),fieldName:service-name,id:'41060e65-ce4c-414e-b8cf-492ccb19245f',selectedOptions:!(kibana),title:service-name),grow:!t,order:0,type:optionsListControl,width:medium),ed96828e-efe9-43ad-be3f-0e04218f79af:(explicitInput:(dataViewId:'serverless.logs-*',enhancements:(),fieldName:to-env,id:ed96828e-efe9-43ad-be3f-0e04218f79af,selectedOptions:!(production),title:to-env),grow:!t,order:2,type:optionsListControl,width:medium))))`;
}

export function getUsefulLinks({
  selectedCommitHash,
  previousCommitHash,
}: {
  previousCommitHash: string;
  selectedCommitHash: string;
}): Record<string, string> {
  return {
    'Commits contained in deploy': `https://github.com/elastic/kibana/compare/${previousCommitHash}...${selectedCommitHash}`,
    'Argo Workflow (use Elastic Cloud Staging VPN)': `https://argo-workflows.cd.internal.qa.elastic.cloud/workflows?label=hash%3D${selectedCommitHash}`,
    'GPCTL Deployment Status dashboard for nonprod': getLinkForGPCTLNonProd(selectedCommitHash),
    'GPCTL Deployment Status dashboard for prod': getLinkForGPCTLProd(selectedCommitHash),
    'Quality Gate pipeline': `https://buildkite.com/elastic/kibana-tests/builds?branch=main`,
    'Kibana Serverless Release pipeline': `https://buildkite.com/elastic/kibana-serverless-release/builds?commit=${selectedCommitHash}`,
  };
}

export function makeUsefulLinksHtml(
  heading: string,
  data: {
    previousCommitHash: string;
    selectedCommitHash: string;
  }
) {
  return (
    `<h4>${heading}</h4>` +
    Object.entries(getUsefulLinks(data))
      .map(([name, url]) => `<div>:link: ${link(name, url)}</div>`)
      .join('\n')
  );
}
