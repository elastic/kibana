const { esql, cmd, exp } = require('@elastic/esql');

const label = 'host.name';
const labelSimple = 'error_rate';
const selector = `data['${label.replace(/['\\]/g, '\\$&')}']`;
const selectorSimple = `data['${labelSimple.replace(/['\\]/g, '\\$&')}']`;

// Approach A: double-param column ?? for LHS via esql.dpar, value param for selector
try {
  let q = esql.from(['idx'], ['_source']).where`type == "alert"`;
  q = q.pipe`EVAL ${esql.dpar(labelSimple)} = JSON_EXTRACT(_source, ${selectorSimple})`;
  console.log('A:', q.print('basic'));
  console.log('A params:', JSON.stringify(q.getParams()));
} catch (e) { console.log('A ERR', e.message); }

// Approach A2: special-char label as column
try {
  let q = esql.from(['idx'], ['_source']);
  q = q.pipe`EVAL ${esql.dpar(label)} = JSON_EXTRACT(_source, ${selector})`;
  console.log('A2:', q.print('basic'));
  console.log('A2 params:', JSON.stringify(q.getParams()));
} catch (e) { console.log('A2 ERR', e.message); }

// Approach C: cmd synth to build full EVAL command then splice as hole
try {
  const evalCmd = cmd`EVAL ${esql.dpar(label)} = JSON_EXTRACT(_source, ${selector})`;
  let q = esql.from(['idx'], ['_source']).pipe`${evalCmd}`;
  console.log('C:', q.print('basic'));
} catch (e) { console.log('C ERR', e.message); }

// keep with arbitrary column name
try {
  let q = esql.from(['idx'], ['_source']).keep('@timestamp', 'episode.status', label, labelSimple);
  console.log('KEEP:', q.print('basic'));
} catch (e) { console.log('KEEP ERR', e.message); }
