import type { FC } from 'react';
import { ContentSlide, BulletList } from '../components';

const items = [
  <span key="1">
    <strong>Upgrade migration</strong> — flat index → rollover alias approach is sketched.
    What&apos;s the rollback strategy?
  </span>,
  <span key="2">
    <strong>Tuning rolloverMaxAge</strong> — default is 1d. Does the team have data on execution
    volume to inform this?
  </span>,
  <span key="3">
    <strong>Cold-phase retention</strong> — should we expose a user-configurable setting for how long
    executions stay in cold before deletion?
  </span>,
  <span key="4">
    <strong>Encoded IDs</strong> — not human-readable. Impact on debugging and external
    integrations?
  </span>,
  <span key="5">
    <strong>ILM policy approval</strong> — is the proposed ILM policy acceptable for the product?
    To be confirmed with Tinsae Erkailo.
  </span>,
  <span key="6">
    <strong>Approach validation</strong> — validate the overall rollover index approach with
    someone with deeper ES index expertise (Brandon Kobel or Yulia Naumenko).
  </span>,
];

export const OpenQuestions: FC = () => (
  <ContentSlide title="Open Questions">
    <BulletList items={items} />
  </ContentSlide>
);
