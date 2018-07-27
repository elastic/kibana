/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import {
  TRYCLOUD_OPTION1,
  TRYCLOUD_OPTION2
} from '../../../common/tutorials/onprem_cloud_instructions';

const KUBERNETES_INSTRUCTIONS = {
  INSTALL: {
    title: 'Download Filebeat kubernetes manifests',
    textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
             '({config.docs.beats.filebeat}/filebeat-getting-started.html). Then check our ' +
             '[Kubernetes documentation]({config.docs.beats.filebeat}/running-on-kubernetes.html).',
    commands: [
      'curl -L -O https://raw.githubusercontent.com/elastic/beats/v{config.kibana.version}/deploy/kubernetes/filebeat-kubernetes.yaml',
    ]
  },
  CONFIG: {
    title: 'Edit the configuration',
    textPre: 'Modify `filebeat-kubernetes.yaml` to set the connection information:',
    commands: [
      '- name: ELASTICSEARCH_HOST',
      '  value: "<es_url>"',
      '- name: ELASTICSEARCH_PORT',
      '  value: "<es_port>"',
      '- name: ELASTICSEARCH_USERNAME',
      '  value: "elastic"',
      '- name: ELASTICSEARCH_PASSWORD',
      '  value: "<password>"'
    ],
    textPost: 'Where `<password>` is the password of the `elastic` user, ' +
              '`<es_url>` is the URL of Elasticsearch, without the port and `<es_port>` is the Elasticsearch port.'
  },
  CONFIG_CLOUD: {
    title: 'Edit the configuration',
    textPre: 'Modify `filebeat-kubernetes.yaml` to set the connection information:',
    commands: [
      '- name: ELASTIC_CLOUD_ID',
      '  value: "{config.cloud.id}"',
      '- name: ELASTIC_CLOUD_AUTH',
      '  value: "elastic:<password>"',
    ],
    textPost: 'Where `<password>` is the password of the `elastic` user.'
  },
  DEPLOY: {
    title: 'Deploy to Kuberentes',
    textPre: 'Deploy the configured manifest to Kuberentes:',
    commands: [
      'kubectl create -f filebeat-kubernetes.yaml'
    ]
  },
};

export function kubernetesLogsSpecProvider() {
  const moduleName = 'kubernetes';
  const platforms = ['GENERIC'];
  return {
    id: 'kubernetesLogs',
    name: 'Kubernetes logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Fetch logs from your containers running on Kubernetes.',
    longDescription: 'The `kubernetes` Filebeat manifest fetches logs from Kubernetes containers.' +
                     ' [Learn more]({config.docs.beats.filebeat}/running-on-kubernetes.html).',
    euiIconType: 'logoKubernetes',
    artifacts: {
      application: {
        label: 'Discover',
        path: '/app/kibana#/discover'
      },
      dashboards: [],
      exportedFields: {
        documentationUrl: '{config.docs.beats.filebeat}/exported-fields-kubernetes-processor.html'
      }
    },
    completionTimeMinutes: 10,
    onPrem: onPremInstructions(moduleName, platforms),
    elasticCloud: cloudInstructions(moduleName, platforms),
    onPremElasticCloud: onPremCloudInstructions(moduleName, platforms)
  };
}



function onPremInstructions(moduleName, platforms) {
  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const instructions = [];
    instructions.push(KUBERNETES_INSTRUCTIONS.INSTALL);
    instructions.push(KUBERNETES_INSTRUCTIONS.CONFIG);
    instructions.push(KUBERNETES_INSTRUCTIONS.DEPLOY);
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: instructions
    });
  }
  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck()
      }
    ]
  };
}

function onPremCloudInstructions(moduleName, platforms) {
  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: [
        TRYCLOUD_OPTION1,
        TRYCLOUD_OPTION2,
        KUBERNETES_INSTRUCTIONS.INSTALL,
        KUBERNETES_INSTRUCTIONS.CONFIG_CLOUD,
        KUBERNETES_INSTRUCTIONS.DEPLOY
      ]
    });
  }

  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck()
      }
    ]
  };
}

function cloudInstructions(moduleName, platforms) {
  const variants = [];
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    variants.push({
      id: INSTRUCTION_VARIANT[platform],
      instructions: [
        KUBERNETES_INSTRUCTIONS.INSTALL,
        KUBERNETES_INSTRUCTIONS.CONFIG_CLOUD,
        KUBERNETES_INSTRUCTIONS.DEPLOY
      ]
    });
  }

  return {
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: variants,
        statusCheck: filebeatStatusCheck()
      }
    ]
  };
}


export function filebeatStatusCheck() {
  return {
    title: 'Status',
    text: 'Check that data is received from the Filebeat running on Kubernetes',
    btnLabel: 'Check data',
    success: 'Data successfully received from Filebeat',
    error: 'No data has been received from Filebeat yet',
    esHitsCheck: {
      index: 'filebeat-*',
      query: {
        wildcard: {
          'kubernetes.namespace': '*'
        }
      }
    }
  };
}