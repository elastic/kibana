/* eslint-disable no-console */
require('../src/setup_node_env');

const [scenario, preload] = process.argv.slice(2);

const heapMb = () => {
  global.gc();
  global.gc();
  return process.memoryUsage().heapUsed / 1024 / 1024;
};
const now = () => process.hrtime.bigint();
const msSince = (start) => Math.round(Number(now() - start) / 1e6);

if (preload === 'preload') {
  require('@kbn/zod');
  require('@kbn/zod');
  require('react');
  require('react-dom/server');
  require('@kbn/i18n');
}

const run = async () => {
  const before = heapMb();
  const start = now();
  let runtime;
  let slidesPack;

  if (scenario === 'components') {
    runtime = await require('../x-pack/platform/plugins/shared/isomer/server/create_runtime').createRuntime();
  } else {
    const { createKibanaIsomerRuntime } = require('@kbn/isomer');
    const { componentsPack } = require('@kbn/isomer-components');
    const slides = require('@elastic/isomer-primitives-slides');
    slidesPack = slides.slidesPack;
    runtime = createKibanaIsomerRuntime({ packs: [componentsPack, slidesPack] });
  }

  const buildMs = msSince(start);
  const buildHeap = heapMb() - before;

  let firstRenderMs;
  if (scenario === 'listKeys') {
    console.log(Object.keys(runtime));
    return;
  }
  if (slidesPack) {
    const primitive = slidesPack.primitives.find((p) => p.type === 'slideTable') ?? slidesPack.primitives[0];
    const node = primitive.examples[0];
    const renderStart = now();
    const composition = { type: 'view', body: [node] };
    const { valid, errors } = runtime.validate(composition);
    if (!valid) throw new Error(JSON.stringify(errors).slice(0, 300));
    const { blocks } = runtime.surfaces.slack.render(composition, { heading: false });
    firstRenderMs = msSince(renderStart);
    if (!blocks?.length) throw new Error('empty render');
  }

  console.log(
    JSON.stringify({
      scenario,
      preload: !!preload,
      buildMs,
      heapMb: +buildHeap.toFixed(1),
      ...(firstRenderMs !== undefined && { firstRenderMs }),
    })
  );
};

run().catch((e) => {
  console.error(scenario, e.message);
  process.exit(1);
});
