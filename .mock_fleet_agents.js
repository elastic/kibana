/* Temporary helper: generates mock Fleet agent docs and bulk-indexes them into .fleet-agents. */
const crypto = require('crypto');

const POLICY_ID = process.env.POLICY_ID;
const ES_URL = process.env.ES_URL || 'http://localhost:9200';
const ES_AUTH = process.env.ES_AUTH || 'elastic:changeme';

if (!POLICY_ID) {
  console.error('POLICY_ID env var is required');
  process.exit(1);
}

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const uuid = () => crypto.randomUUID();

const OS_VARIANTS = [
  { family: 'linux', full: 'Ubuntu 22.04.3 LTS', kernel: '5.15.0-91-generic', name: 'Ubuntu', platform: 'ubuntu', version: '22.04.3 LTS' },
  { family: 'windows', full: 'Windows Server 2022 Datacenter', kernel: '10.0.20348.2159', name: 'Windows Server 2022 Datacenter', platform: 'windows', version: '10.0' },
  { family: 'darwin', full: 'macOS 14.2.1', kernel: '23.2.0', name: 'macOS', platform: 'darwin', version: '14.2.1' },
];

// [hostname, version, minutes-since-checkin, checkin-status, extra]
const SPECS = [
  ['web-server-01', '9.5.0', 1, 'online', {}],
  ['web-server-02', '9.5.0', 2, 'online', {}],
  ['db-primary-01', '9.5.0', 1, 'online', {}],
  ['db-replica-02', '9.4.0', 3, 'online', {}],
  ['cache-node-01', '9.5.0', 0, 'error', {}],
  ['edge-proxy-01', '9.4.0', 4, 'degraded', {}],
  ['batch-worker-03', '9.4.0', 8000, 'online', {}], // offline (stale checkin)
  ['batch-worker-04', '9.5.0', 12000, 'online', {}], // offline
  ['analytics-01', '9.4.0', 2, 'online', { upgrade_started_at: iso(now - 60 * 1000) }], // updating
  ['ingest-node-05', '9.5.0', 1, 'online', {}],
  ['ingest-node-06', '9.5.0', 2, 'online', {}],
  ['monitoring-01', '9.5.0', 5, 'online', {}],
];

const lines = [];
SPECS.forEach((spec, i) => {
  const [hostname, version, minsAgo, checkinStatus, extra] = spec;
  const id = uuid();
  const os = OS_VARIANTS[i % OS_VARIANTS.length];
  const lastCheckin = iso(now - minsAgo * 60 * 1000);
  const enrolledAt = iso(now - (7 + i) * 24 * 60 * 60 * 1000);
  const octet = 11 + i;

  const doc = {
    access_api_key_id: crypto.randomBytes(12).toString('hex'),
    action_seq_no: [-1],
    active: true,
    agent: { id, version },
    enrolled_at: enrolledAt,
    local_metadata: {
      elastic: {
        agent: {
          'build.original': `${version} (build; snapshot)`,
          id,
          log_level: 'info',
          snapshot: false,
          upgradeable: true,
          version,
        },
      },
      host: {
        architecture: 'x86_64',
        hostname,
        id: crypto.randomBytes(16).toString('hex'),
        ip: [`10.0.1.${octet}`],
        mac: [`aa:bb:cc:dd:ee:${octet.toString(16).padStart(2, '0')}`],
        name: hostname,
      },
      os,
    },
    policy_id: POLICY_ID,
    type: 'PERMANENT',
    policy_revision_idx: 1,
    policy_coordinator_idx: 1,
    last_checkin: lastCheckin,
    last_checkin_status: checkinStatus,
    updated_at: lastCheckin,
    tags: ['mock', 'demo'],
    packages: ['system'],
    ...extra,
  };

  lines.push(JSON.stringify({ index: { _index: '.fleet-agents', _id: id } }));
  lines.push(JSON.stringify(doc));
});

const body = lines.join('\n') + '\n';

const ES_TOKEN = process.env.ES_TOKEN;
let authHeader;
if (ES_TOKEN) {
  authHeader = 'Bearer ' + ES_TOKEN;
} else {
  const [user, pass] = ES_AUTH.split(':');
  authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

fetch(`${ES_URL}/_bulk?refresh=wait_for`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-ndjson',
    Authorization: authHeader,
  },
  body,
})
  .then((r) => r.json())
  .then((json) => {
    if (json.errors) {
      console.error('Bulk had errors:', JSON.stringify(json.items?.[0], null, 2));
      process.exit(1);
    }
    console.log(`Indexed ${json.items.length} mock agents successfully.`);
  })
  .catch((e) => {
    console.error('Request failed:', e.message);
    process.exit(1);
  });
