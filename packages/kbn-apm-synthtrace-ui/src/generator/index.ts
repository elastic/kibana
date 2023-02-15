import { apm } from '@kbn/apm-synthtrace-client';

export function run() {
  apm.service({ name: '', environment: '', agentName: '' });
}
