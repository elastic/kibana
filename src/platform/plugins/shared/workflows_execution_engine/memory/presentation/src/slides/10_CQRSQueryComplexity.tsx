import type { FC } from 'react';
import { ContentSlide, TwoColumns, CodeBlock, BulletList } from '../components';

const codeLines = [
  'getWorkflowExecution(id, spaceId):',
  '  // O(1) mget — check state index first',
  '  doc = executionState.mget([id])',
  '  if doc exists:',
  '    return doc',
  '',
  '  // Fallback: already migrated',
  '  return history.searchById(id)',
];

const bulletItems = [
  'Every read queries two tiers with dedup',
  'Search spans both tiers with field collapsing',
  'Pagination totals inflated during overlap window',
  'Get-by-id needs waterfall with fallback',
  'Overlap between migration and cleanup',
];

export const CQRSQueryComplexity: FC = () => (
  <ContentSlide title="CQRS: Two-Tier Query Complexity">
    <TwoColumns
      left={<CodeBlock code={codeLines.join('\n')} language="javascript" />}
      right={
        <div>
          <h3 className="text-slide-h3 mb-3">Complexity Introduced</h3>
          <BulletList items={bulletItems} />
        </div>
      }
    />
  </ContentSlide>
);
