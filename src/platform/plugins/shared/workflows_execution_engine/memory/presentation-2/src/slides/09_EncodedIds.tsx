import type { FC } from 'react';
import { ContentSlide, TwoColumns, CodeBlock, BulletList } from '../components';

const codeExample = [
  'indexSuffix: "000003"',
  'uuid:        "a1b2c3d4e5f6..."',
  '',
  '# Composed ID',
  'decoded:     "000003_a1b2c3d4e5f6..."',
  '',
  '# Optionally base64url-encoded',
  'encoded:     "MDAwMDAzX2ExYjJjM2Q0..."',
].join('\n');

export const EncodedIds: FC = () => (
  <ContentSlide title="Encoded Execution IDs">
    <TwoColumns
      left={<CodeBlock code={codeExample} language="yaml" />}
      right={
        <BulletList items={[
          <span><strong>Workflow ID:</strong> <code>{'{indexSuffix}_{uuidHex}'}</code></span>,
          <span><strong>Step ID:</strong> <code>{'{indexSuffix}_{sha256(execId_scope_stepId)}'}</code></span>,
          'Any caller can decode the ID → extract index suffix → resolve backing index',
          <span>Enables <strong>O(1) direct GET</strong> without alias fan-out</span>,
          <span>Base64 encoding is optional — raw composed IDs may be preferable for debuggability</span>,
        ]} />
      }
    />
  </ContentSlide>
);
