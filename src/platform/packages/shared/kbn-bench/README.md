# @kbn/bench

Lightweight benchmarking runner for Kibana code. It executes user-defined benchmark suites, aggregates timing/metric summaries, and (optionally) compares results between two Git refs using isolated worktrees powered by `@kbn/workspaces`.

## Key Features

- Module and script style benchmarks (run code in-process or spawn a separate process)
- Multiple runs with aggregated stats (avg, std dev, etc.)
- Automatically collected system metrics (cpu/rss/gc)
- Diff mode: compare metrics between a baseline (left) and a target (right) ref
- Optional CPU profiling with automatic merge + Speedscope opening

## When to Use

Use `@kbn/bench` when you need quick, repeatable micro/mid-level performance measurements for a change set, or to guard against regressions between two refs (e.g. `main` vs your topic branch).

## Benchmark Configs

You supply one or more `benchmark.config.{ts,js}` files. Example (see `examples/benchmark.config.ts`):

```ts
import type { InitialBenchConfig } from '@kbn/bench';

const config: InitialBenchConfig = {
  runs: 3,
  name: 'example',
  benchmarks: [
    {
      kind: 'module',
      name: 'cpu.primes-inline',
      module: require.resolve('./primes_benchmark'),
      description: 'Compute primes in-process',
      compare: { missing: 'skip' },
    },
    {
      kind: 'script',
      name: 'cpu.worker-script',
      description: 'CPU work in child process',
      run: { cmd: 'node', args: [require.resolve('./worker_script')] },
      compare: { missing: 'skip' },
    },
  ],
};
export default config;
```

Module benchmarks export an async factory returning `{ run(ctx) { /* work */ } }` (see `examples/primes_benchmark.ts`). Script benchmarks just spawn a process you define.

## CLI Usage

Run via the dev CLI (from Kibana repo root):

```bash
node scripts/bench.js
```

Flags:

```
--config        Glob for benchmark config files (repeat or comma separate)
--left          Baseline ref (defaults to current working tree contents)
--right         Ref to compare against (enables diff report)
--profile       Collect a CPU profile for each benchmark run
--open-profile  Open merged profiles in Speedscope after completion
--grep          Filter benchmarks by substring (repeatable)
```

Examples:

1. Run benchmarks in the current working directory only:

```bash
node scripts/bench --config src/platform/packages/shared/kbn-bench/examples/benchmark.config.ts
```

2. Compare a feature branch against main:

```bash
node scripts/bench --config src/**/benchmark.config.ts --left main --right my-feature
```

3. Profile and open results:

```bash
node scripts/bench --config src/**/benchmark.config.ts --profile --open-profile
```

4. Focus on a subset of benchmarks by name substring:

```bash
node scripts/bench --config src/**/benchmark.config.ts --grep primes --grep worker
```

## Output

Two reports are printed:

1. Results table per ref with summary metrics (if `--right` is not supplied)
2. Diff table (when both `--left` and `--right` supplied) showing absolute delta and percentage change (percentage uses the right-hand value as baseline).

If profiling is enabled, merged profiles are stored (and optionally opened) in a data directory under your Kibana repo.

## Workspaces & Isolation

When you pass `--left` and/or `--right`, the tool relies on `@kbn/workspaces` to materialize those refs in temporary git worktrees so code is executed in a clean tree detached from your current working directory. See `@kbn/workspaces` README for deeper details on how worktrees are created and cached.
