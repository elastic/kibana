import type { FC } from 'react';
import { ContentSlide, BulletList } from '../components';

export const OpenQuestions: FC = () => (
  <ContentSlide title="Open Questions">
    <BulletList items={[
      <span><strong>Rollover frequency</strong> — is <code>1d</code> the right default? Do we have execution volume data to inform this?</span>,
      <span><strong>Retention thresholds</strong> — should we expose user-configurable retention settings? What are the right defaults?</span>,
      <span><strong>Encoded ID debuggability</strong> — base64 vs. raw composed IDs? Impact on external integrations?</span>,
      <span><strong>Stuck execution detection</strong> — how do we handle executions that hold backing indexes hot indefinitely?</span>,
      <span><strong>ILM policy details</strong> — phases, thresholds, and actions are raw assumptions; to be finalized with product</span>,
    ]} />
  </ContentSlide>
);
