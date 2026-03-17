import type { FC } from 'react';
import { ContentSlide, Card } from '../components';

export const Benefits: FC = () => (
  <ContentSlide title="Benefits">
    <div className="grid grid-cols-2 gap-4">
      <Card variant="success" title="Bounded Hot-Phase Indexes">
        <p className="text-slide-body text-slide-secondary">
          Hot tier stays small and fast, bounded by actively written backing indexes rather than total
          historical volume.
        </p>
      </Card>
      <Card variant="success" title="ILM-Managed Lifecycle">
        <p className="text-slide-body text-slide-secondary">
          No delete_by_query needed. No tombstones, no segment merges, no lingering deleted documents.
          ILM handles everything.
        </p>
      </Card>
      <Card variant="success" title="Preserved Mutability">
        <p className="text-slide-body text-slide-secondary">
          Unlike data streams, rollover aliases fully support update, mget, doc_as_upsert, and delete
          operations.
        </p>
      </Card>
      <Card variant="success" title="O(1) Document Lookups">
        <p className="text-slide-body text-slide-secondary">
          Encoded IDs carry the backing index suffix, enabling direct GET without alias fan-out on the
          hot path.
        </p>
      </Card>
      <Card variant="success" title="Transparent Search via Alias" className="col-span-2">
        <p className="text-slide-body text-slide-secondary">
          Search queries use the alias which fans out across all backing indexes automatically. No
          application-level coordination needed.
        </p>
      </Card>
    </div>
  </ContentSlide>
);
