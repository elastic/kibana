import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BenchmarkName, QuestionResult, RunSummary } from './types.js';

export interface ReporterOptions {
  dir: string;
  benchmark: BenchmarkName;
  extractionMethod: string;
  feedMode: string;
}

const categoryKey = (r: QuestionResult): string => {
  if (r.question_type) return r.question_type;
  if (r.category !== undefined) return `cat_${r.category}`;
  return 'unknown';
};

export const buildSummary = (
  results: QuestionResult[],
  opts: Omit<ReporterOptions, 'dir'>
): RunSummary => {
  const scored = results.filter((r) => r.score !== null);
  const correct = scored.filter((r) => r.score === 1).length;
  const partial = scored.filter((r) => r.score === 0.5).length;
  const total = scored.length;
  const denom = total === 0 ? 1 : total;
  const accuracy = ((correct + 0.5 * partial) / denom) * 100;

  const categoryScores: RunSummary['category_scores'] = {};
  for (const r of scored) {
    const key = categoryKey(r);
    const entry = categoryScores[key] ?? { correct: 0, partial: 0, total: 0 };
    entry.total += 1;
    if (r.score === 1) entry.correct += 1;
    else if (r.score === 0.5) entry.partial += 1;
    categoryScores[key] = entry;
  }

  return {
    timestamp: new Date().toISOString(),
    benchmark: opts.benchmark,
    extraction_method: opts.extractionMethod,
    feed_mode: opts.feedMode,
    total_questions: results.length,
    correct,
    partial,
    accuracy: Number(accuracy.toFixed(2)),
    category_scores: categoryScores,
    results,
  };
};

export class Reporter {
  constructor(private readonly opts: ReporterOptions) {}

  async write(results: QuestionResult[]): Promise<{ summary: RunSummary; paths: string[] }> {
    const summary = buildSummary(results, this.opts);
    await mkdir(this.opts.dir, { recursive: true });

    const jsonPath = join(this.opts.dir, 'results.json');
    const mdPath = join(this.opts.dir, 'summary.md');
    await writeFile(jsonPath, JSON.stringify(summary, null, 2), 'utf8');
    await writeFile(mdPath, renderMarkdown(summary), 'utf8');
    return { summary, paths: [jsonPath, mdPath] };
  }

  async writeRaw(questionId: string, payload: unknown): Promise<string> {
    const rawDir = join(this.opts.dir, 'raw');
    await mkdir(rawDir, { recursive: true });
    const safe = questionId.replace(/[^A-Za-z0-9._-]/g, '_');
    const path = join(rawDir, `${safe}.json`);
    await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
    return path;
  }
}

const renderMarkdown = (summary: RunSummary): string => {
  const lines: string[] = [];
  lines.push(`# ${summary.benchmark} — run summary`);
  lines.push('');
  lines.push(`- timestamp: \`${summary.timestamp}\``);
  lines.push(`- extraction_method: \`${summary.extraction_method}\``);
  lines.push(`- feed_mode: \`${summary.feed_mode}\``);
  lines.push(`- total questions: **${summary.total_questions}**`);
  lines.push(`- correct: **${summary.correct}**`);
  lines.push(`- partial: **${summary.partial}**`);
  lines.push(`- accuracy: **${summary.accuracy}%**`);
  lines.push('');
  lines.push('## Category scores');
  lines.push('');
  lines.push('| Category | Correct | Partial | Total |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const [key, entry] of Object.entries(summary.category_scores)) {
    lines.push(`| ${key} | ${entry.correct} | ${entry.partial} | ${entry.total} |`);
  }
  lines.push('');
  return lines.join('\n');
};
