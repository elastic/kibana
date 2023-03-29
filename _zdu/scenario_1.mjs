#!/usr/bin/env npx zx

import { $, question } from 'zx'

$.verbose = false

const KB_URL = 'http://elastic:changeme@localhost:15601'

const createRuleURL = `${KB_URL}/api/alerting/rule`
const deleteRuleURL = `${KB_URL}/api/alerting/rule`

const ruleDef = {
  rule_type_id: '.index-threshold-Jr',
  name: 'scenario 1',
  schedule: { interval: '1s' },
  actions: [],
  consumer: 'alerts',
  tags: [],
  params: {
    index: ['es-apm-sys-sim'],
    timeField: '@timestamp',
    aggType: 'avg',
    aggField: 'system.cpu.total.norm.pct',
    groupBy: 'top',
    termSize: 100,
    termField: 'host.name.keyword',
    timeWindowSize: 3,
    timeWindowUnit: 's',
    thresholdComparator: '>',
    threshold: [0.5],
  },
}

const result = await curl(createRuleURL, 'POST', ruleDef)
if (result.exitCode !== 0) {
  console.log('error creating rule: ', +result.stdout)
  process.exit(1)
}

const rule = JSON.parse(result.stdout)
console.log(`created rule: ${JSON.stringify(rule, null, 4)}`)
console.log('')

await question('the rule will be deleted when you press enter - do your things ...')

const deleteResult = await curl(`${deleteRuleURL}/${rule.id}`, 'DELETE')
if (deleteResult.exitCode !== 0) {
  console.log('error deleting rule:', +deleteResult.stdout)
  process.exit(1)
}
if (deleteResult.stdout !== '') {
  console.log('server error deleting rule:', deleteResult.stdout)
  process.exit(1)
}

process.exit(0)

/** @type { (url: string, method?: string, data?: any) => Promise<ReturnType<$>> } */
async function curl(url, method, data) {
  const headerXSRF = 'kbn-xsrf: foo'
  const headerType = 'content-type: application/json'

  data = JSON.stringify(data, null, 4)

  if (!method) method = 'GET'

  let result
  if (!data) {
    result = $`curl -sk -X ${method} -H ${headerXSRF} -H ${headerType} ${url}`
  } else {
    result = $`curl -sk -X ${method} -H ${headerXSRF} -H ${headerType} -d ${data} ${url}`
  }

  return await result
}
