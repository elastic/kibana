#!/usr/bin/env npx zx

import { $, sleep, question } from 'zx'

$.verbose = false

const NEW_KB_URL = 'http://elastic:changeme@localhost:15601'
const OLD_KB_URL = 'http://elastic:changeme@localhost:5601'
const ES_URL     = 'http://elastic:changeme@localhost:9200'

const NEW_RULE_URL = `${NEW_KB_URL}/api/alerting/rule`
const OLD_RULE_URL = `${OLD_KB_URL}/api/alerting/rule`

const ruleDef = {
  rule_type_id: '.index-threshold',
  name: 'scenario 3',
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

const result = await curl(NEW_RULE_URL, 'POST', ruleDef)
if (result.exitCode !== 0) {
  console.log('error creating rule: ', +result.stdout)
  process.exit(1)
}

const rule = JSON.parse(result.stdout)
console.log(`created rule: ${JSON.stringify(rule, null, 4)}`)
console.log('')

const esRule = await curl(`${ES_URL}/.kibana/_doc/alert:${rule.id}`)
console.log(`rule doc from es: ${JSON.stringify(esRule.stdout, null, 4)}`)
console.log('')

await question('the rule will be deleted when you press enter - do your things ...')

const deleteResult = await curl(`${NEW_RULE_URL}/${rule.id}`, 'DELETE')
console.log('delete: ', deleteResult.stdout)
await sleep(1000)

process.exit(0)

/** @type { (url: string, method: string, data: any) => Promise<ReturnType<$>> } */
async function curl(url, method = 'GET', data = undefined) {
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
