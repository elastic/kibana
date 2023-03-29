#!/usr/bin/env npx zx

import { $, sleep } from 'zx'

$.verbose = false

const NEW_KB_URL = 'http://elastic:changeme@localhost:15601'
const OLD_KB_URL = 'http://elastic:changeme@localhost:5601'

const NEW_RULE_URL = `${NEW_KB_URL}/api/alerting/rule`
const OLD_RULE_URL = `${OLD_KB_URL}/api/alerting/rule`

const ruleDef = {
  rule_type_id: '.index-threshold-Jr',
  name: 'scenario 2',
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

// rule created, now perform operations using old kibana
await sleep(1000)

const disableResult = await curl(`${OLD_RULE_URL}/${rule.id}/_disable`, 'POST')
console.log('disable ', disableResult.stdout)
await sleep(1000)

const enableResult = await curl(`${OLD_RULE_URL}/${rule.id}/_enable`, 'POST')
console.log('enable: ', enableResult.stdout)
await sleep(1000)

const findResult = await curl(`${OLD_RULE_URL}/rules/_find`, 'GET')
console.log('find: ', findResult.stdout)
await sleep(1000)

const getResult = await curl(`${OLD_RULE_URL}/${rule.id}`, 'GET')
console.log('get: ', getResult.stdout)
await sleep(1000)

const updateBody = { ...ruleDef, rule_type_id: undefined, consumer: undefined }
const updateResult = await curl(`${OLD_RULE_URL}/${rule.id}`, 'PUT', updateBody)
console.log('update: ', updateResult.stdout)
await sleep(1000)

const muteAllResult = await curl(`${OLD_RULE_URL}/${rule.id}/_mute_all`, 'POST')
console.log('muteAll: ', muteAllResult.stdout)
await sleep(1000)

const unmuteAllResult = await curl(`${OLD_RULE_URL}/${rule.id}/_unmute_all`, 'POST')
console.log('unmuteAll: ', unmuteAllResult.stdout)
await sleep(1000)

const muteAlertResult = await curl(`${OLD_RULE_URL}/${rule.id}/alert/some-alert-id/_mute`, 'POST')
console.log('muteAlert: ', muteAlertResult.stdout)
await sleep(1000)

const unmuteAlertResult = await curl(`${OLD_RULE_URL}/${rule.id}/alert/some-alert-id/_unmute`, 'POST')
console.log('unmuteAlert: ', unmuteAlertResult.stdout)
await sleep(1000)

const deleteResult = await curl(`${OLD_RULE_URL}/${rule.id}`, 'DELETE')
console.log('delete: ', deleteResult.stdout)
await sleep(1000)

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
