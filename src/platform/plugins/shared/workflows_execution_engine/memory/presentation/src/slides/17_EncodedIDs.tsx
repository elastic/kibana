import type { FC } from 'react';
import { ContentSlide, TwoColumns, CodeBlock, BulletList } from '../components';

const codeLines = [
  '// Workflow execution ID',
  'raw: "000003_a1b2c3d4e5f6..."',
  'base64url: "MDAwMDAzX2ExYj..."',
  '',
  '// Step execution ID',
  'raw: "000003_7f8a9b2c3d4e..."',
  'base64url: "MDAwMDAzXzdmOGE..."',
  '',
  '// Structure: {indexSuffix}_{uniquePart}',
  '// Workflow: indexSuffix + uuid',
  '// Step: indexSuffix + SHA-256(execId_scope_stepId)',
];

const bullets = [
  'Workflow ID: {indexSuffix}_{uuidHex}',
  'Step ID: {indexSuffix}_{sha256(executionId_scopePath_stepId)}',
  'Any caller can parse the ID to resolve the backing index',
  'Enables O(1) direct GET without alias fan-out',
  'Base64 encoding is optional — makes IDs look like opaque tokens, but raw composed IDs may be preferred for debuggability',
];

export const EncodedIDs: FC = () => (
  <ContentSlide title="Encoded Execution IDs">
    <p className="text-slide-body text-slide-secondary mb-4">
      With multiple backing indexes behind an alias, looking up a specific document requires a fan-out search across all of them.
      Encoding the backing index suffix into the ID lets any caller resolve the exact index for an O(1) direct GET.
    </p>
    <TwoColumns
      left={<CodeBlock code={codeLines.join('\n')} language="typescript" />}
      right={<BulletList items={bullets} />}
    />
  </ContentSlide>
);
