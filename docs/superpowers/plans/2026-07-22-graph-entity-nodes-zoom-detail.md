# Graph Entity Nodes — Zoom Detail Levels & Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign entity graph nodes into a single `EntityNode` that renders a detailed card or a simplified icon tile based on a zoom-derived detail level.

**Architecture:** A `ZoomDetailLevelProvider` (inside ReactFlow) subscribes to the zoom scale via `useStore`, maps it to a discrete `DetailLevel` (`'simplified' | 'detailed'`), and provides it through React Context. A single `EntityNode` renderer — aliased from the five legacy shape keys plus a new `entity` key — reads `useDetailLevel()` and delegates to `EntityNodeDetailed` (300px card) or `EntityNodeSimplified` (40px tile). Metadata rows render only when their view-model data is present.

**Tech Stack:** React, TypeScript, `@xyflow/react` (ReactFlow), `@elastic/eui`, `@emotion/react` (styled), Jest + `@testing-library/react`, Storybook.

## Global Constraints

- Front-end only. No server/schema (`common/schema/graph/v1.ts`) changes; new view-model fields are optional and gated on presence.
- New files use `snake_case`; components/types `PascalCase`; functions/vars `camelCase`.
- Use `import type` for type-only imports; no `any`/`unknown`; explicit return types on exported functions.
- Prefer const arrow functions; prefer destructuring; single quotes.
- Use `@elastic/eui` + Emotion for styling; follow existing patterns in the `node/` folder.
- `showMetadata` defaults to `true`. Toggle owner (Display panel) is out of scope.
- Package root for all paths below: `x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components`
- Run Jest per file: `node scripts/jest <testFilePath>`
- Type check: `node scripts/type_check --project x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/tsconfig.json`

## File Structure

**Create:**
- `detail_level/detail_level.ts` — `DetailLevel` type, `DETAIL_LEVEL_ZOOM_THRESHOLD`, `getDetailLevel(zoom)`
- `detail_level/detail_level.test.ts`
- `detail_level/detail_level_context.tsx` — Context, `ZoomDetailLevelProvider`, `useDetailLevel`
- `detail_level/detail_level_context.test.tsx`
- `detail_level/index.ts`
- `node/entity_node/entity_icon.tsx` — shared 40×40 icon tile + state color + count badge
- `node/entity_node/entity_icon.test.tsx`
- `node/entity_node/entity_node_metadata.tsx` — toggleable metadata section
- `node/entity_node/entity_node_metadata.test.tsx`
- `node/entity_node/entity_node_detailed.tsx` — detailed card
- `node/entity_node/entity_node_detailed.test.tsx`
- `node/entity_node/entity_node_detailed.stories.tsx`
- `node/entity_node/entity_node_simplified.tsx` — simplified tile
- `node/entity_node/entity_node_simplified.test.tsx`
- `node/entity_node/entity_node.tsx` — smart wrapper (registered renderer)
- `node/entity_node/entity_node.test.tsx`
- `node/entity_node/index.ts`

**Modify:**
- `types.ts` — add optional fields to `EntityNodeViewModel`, add `showMetadata` to base
- `test_ids.ts` — add entity node test ids for new elements
- `node/index.ts` — export `EntityNode`; drop 5 shape-node exports
- `graph/graph.tsx` — register `entity` + alias shapes; wrap with provider
- `utils.ts` — map `entityType`/`entityId` in `buildGraphFromViewModels`

**Delete (Task 9):**
- `node/rectangle_node.tsx`, `node/ellipse_node.tsx`, `node/hexagon_node.tsx`, `node/pentagon_node.tsx`, `node/diamond_node.tsx`, `node/node_details.tsx`, `node/node.test.tsx` (replaced by entity_node tests)

---

### Task 1: DetailLevel type & mapping function

**Files:**
- Create: `detail_level/detail_level.ts`
- Test: `detail_level/detail_level.test.ts`

**Interfaces:**
- Produces:
  - `type DetailLevel = 'simplified' | 'detailed'`
  - `const DETAIL_LEVEL_ZOOM_THRESHOLD = 0.5`
  - `const getDetailLevel = (zoom: number): DetailLevel`

- [ ] **Step 1: Write the failing test**

```ts
// detail_level/detail_level.test.ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDetailLevel, DETAIL_LEVEL_ZOOM_THRESHOLD } from './detail_level';

describe('getDetailLevel', () => {
  it('returns simplified below the threshold', () => {
    expect(getDetailLevel(DETAIL_LEVEL_ZOOM_THRESHOLD - 0.1)).toBe('simplified');
  });

  it('returns detailed at or above the threshold', () => {
    expect(getDetailLevel(DETAIL_LEVEL_ZOOM_THRESHOLD)).toBe('detailed');
    expect(getDetailLevel(DETAIL_LEVEL_ZOOM_THRESHOLD + 0.5)).toBe('detailed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/detail_level/detail_level.test.ts`
Expected: FAIL — cannot find module `./detail_level`.

- [ ] **Step 3: Write minimal implementation**

```ts
// detail_level/detail_level.ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Discrete render mode derived from the current graph zoom. */
export type DetailLevel = 'simplified' | 'detailed';

/**
 * Zoom scale at/above which nodes render their detailed card. Below it they
 * render the simplified icon tile. Tuned against the Figma zoom bands.
 */
export const DETAIL_LEVEL_ZOOM_THRESHOLD = 0.5;

export const getDetailLevel = (zoom: number): DetailLevel =>
  zoom >= DETAIL_LEVEL_ZOOM_THRESHOLD ? 'detailed' : 'simplified';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/detail_level/detail_level.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/detail_level/detail_level.ts x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/detail_level/detail_level.test.ts
git commit -m "feat(graph): add zoom detail-level mapping"
```

---

### Task 2: DetailLevel context & provider

**Files:**
- Create: `detail_level/detail_level_context.tsx`, `detail_level/index.ts`
- Test: `detail_level/detail_level_context.test.tsx`

**Interfaces:**
- Consumes: `getDetailLevel`, `DetailLevel` from `./detail_level`
- Produces:
  - `const ZoomDetailLevelProvider: React.FC<{ children: React.ReactNode }>`
  - `const useDetailLevel: () => DetailLevel`
  - `index.ts` re-exports `DetailLevel`, `getDetailLevel`, `DETAIL_LEVEL_ZOOM_THRESHOLD`, `ZoomDetailLevelProvider`, `useDetailLevel`

**Notes:** `ZoomDetailLevelProvider` must be rendered inside `<ReactFlow>` because it calls `useStore`. The provided value is the discrete band, so consumers re-render only when the band changes. Default context value is `'detailed'` (matches the non-interactive/initial fit-view state).

- [ ] **Step 1: Write the failing test**

```tsx
// detail_level/detail_level_context.test.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlow } from '@xyflow/react';
import { TestProviders } from '../mock/test_providers';
import { ZoomDetailLevelProvider, useDetailLevel } from './detail_level_context';

const Probe = () => <div data-test-subj="level">{useDetailLevel()}</div>;

const renderAtZoom = (zoom: number) =>
  render(
    <TestProviders>
      <ReactFlow
        nodes={[]}
        edges={[]}
        defaultViewport={{ x: 0, y: 0, zoom }}
        fitView={false}
      >
        <ZoomDetailLevelProvider>
          <Probe />
        </ZoomDetailLevelProvider>
      </ReactFlow>
    </TestProviders>
  );

describe('ZoomDetailLevelProvider / useDetailLevel', () => {
  it('provides detailed at high zoom', () => {
    renderAtZoom(1);
    expect(screen.getByTestId('level')).toHaveTextContent('detailed');
  });

  it('provides simplified at low zoom', () => {
    renderAtZoom(0.2);
    expect(screen.getByTestId('level')).toHaveTextContent('simplified');
  });

  it('defaults to detailed when used outside the provider', () => {
    render(
      <TestProviders>
        <Probe />
      </TestProviders>
    );
    expect(screen.getByTestId('level')).toHaveTextContent('detailed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/detail_level/detail_level_context.test.tsx`
Expected: FAIL — cannot find module `./detail_level_context`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// detail_level/detail_level_context.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useStore, type ReactFlowState } from '@xyflow/react';
import { getDetailLevel, type DetailLevel } from './detail_level';

const DetailLevelContext = createContext<DetailLevel>('detailed');

const zoomSelector = (s: ReactFlowState): number => s.transform[2];

export const ZoomDetailLevelProvider = ({ children }: { children: React.ReactNode }) => {
  const zoom = useStore(zoomSelector);
  const level = useMemo<DetailLevel>(() => getDetailLevel(zoom), [zoom]);

  return <DetailLevelContext.Provider value={level}>{children}</DetailLevelContext.Provider>;
};

export const useDetailLevel = (): DetailLevel => useContext(DetailLevelContext);
```

```ts
// detail_level/index.ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getDetailLevel, DETAIL_LEVEL_ZOOM_THRESHOLD } from './detail_level';
export type { DetailLevel } from './detail_level';
export { ZoomDetailLevelProvider, useDetailLevel } from './detail_level_context';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/detail_level/detail_level_context.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/detail_level/
git commit -m "feat(graph): add zoom detail-level context provider"
```

---

### Task 3: Extend EntityNodeViewModel & add test ids

**Files:**
- Modify: `types.ts`, `test_ids.ts`
- Test: (covered by consuming tasks; this task adds a compile-checked type test)
- Test: `types.detail.test.ts` (create alongside `types.ts`)

**Interfaces:**
- Produces (added to `EntityNodeViewModel`, all optional):
  - `entityType?: string`
  - `entityId?: string`
  - `riskScore?: EntityRiskScore` where `type EntityRiskScore = { value?: number; min?: number; max?: number }`
  - `assetCriticality?: EntityAssetCriticality` where `type EntityAssetCriticality = { extreme?: number; high?: number; medium?: number; low?: number }`
  - `showMetadata?: boolean` (added to `BaseNodeDataViewModel`)
- Produces test ids in `test_ids.ts`:
  - `GRAPH_ENTITY_NODE_SIMPLIFIED_ID`, `GRAPH_ENTITY_NODE_CARD_ID`, `GRAPH_ENTITY_NODE_METADATA_ID`, `GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID`, `GRAPH_ENTITY_NODE_RISK_SCORE_ID`, `GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID`, `GRAPH_ENTITY_NODE_ICON_ID`

- [ ] **Step 1: Write the failing test**

```ts
// types.detail.test.ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityNodeViewModel } from './types';

describe('EntityNodeViewModel detail fields', () => {
  it('accepts the new optional metadata fields', () => {
    const vm: EntityNodeViewModel = {
      id: 'a',
      color: 'primary',
      shape: 'rectangle',
      entityType: 'user',
      entityId: 'john.doe',
      riskScore: { value: 42 },
      assetCriticality: { high: 3 },
      showMetadata: true,
    };
    expect(vm.entityType).toBe('user');
    expect(vm.riskScore?.value).toBe(42);
    expect(vm.assetCriticality?.high).toBe(3);
    expect(vm.showMetadata).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/types.detail.test.ts`
Expected: FAIL — TS errors: `entityType`/`riskScore`/`assetCriticality`/`showMetadata` do not exist on `EntityNodeViewModel`.

- [ ] **Step 3: Write minimal implementation**

In `types.ts`, add types and extend interfaces:

```ts
export interface EntityRiskScore {
  value?: number;
  min?: number;
  max?: number;
}

export interface EntityAssetCriticality {
  extreme?: number;
  high?: number;
  medium?: number;
  low?: number;
}
```

Add `showMetadata?: boolean;` to `BaseNodeDataViewModel`:

```ts
interface BaseNodeDataViewModel {
  interactive?: boolean;
  showMetadata?: boolean;
}
```

Add to `EntityNodeViewModel` (after the handler fields):

```ts
export interface EntityNodeViewModel
  extends Record<string, unknown>,
    EntityNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
  nodeClick?: NodeClickCallback;
  ipClickHandler?: IpClickCallback;
  countryClickHandler?: CountryClickCallback;
  entityType?: string;
  entityId?: string;
  riskScore?: EntityRiskScore;
  assetCriticality?: EntityAssetCriticality;
}
```

In `test_ids.ts`, after `GRAPH_ENTITY_NODE_DETAILS_ID`, add:

```ts
export const GRAPH_ENTITY_NODE_SIMPLIFIED_ID =
  `${GRAPH_ENTITY_NODE_ID}Simplified` as const;
export const GRAPH_ENTITY_NODE_CARD_ID = `${GRAPH_ENTITY_NODE_ID}Card` as const;
export const GRAPH_ENTITY_NODE_METADATA_ID = `${GRAPH_ENTITY_NODE_ID}Metadata` as const;
export const GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID =
  `${GRAPH_ENTITY_NODE_ID}EntityIdRow` as const;
export const GRAPH_ENTITY_NODE_RISK_SCORE_ID = `${GRAPH_ENTITY_NODE_ID}RiskScore` as const;
export const GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID =
  `${GRAPH_ENTITY_NODE_ID}AssetCriticality` as const;
export const GRAPH_ENTITY_NODE_ICON_ID = `${GRAPH_ENTITY_NODE_ID}Icon` as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/types.detail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/types.ts x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/types.detail.test.ts x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/test_ids.ts
git commit -m "feat(graph): extend entity view model with detail fields"
```

---

### Task 4: Shared EntityIcon component

**Files:**
- Create: `node/entity_node/entity_icon.tsx`
- Test: `node/entity_node/entity_icon.test.tsx`

**Interfaces:**
- Consumes: `NodeColor` (from view model `color`), `getSpanIcon` (`node/get_span_icon.ts`), `showStackedShape` (`utils.ts`), `GRAPH_ENTITY_NODE_ICON_ID` (test_ids)
- Produces:
  - `interface EntityIconProps { icon?: string; color?: NodeColor; count?: number; }`
  - `const EntityIcon: React.FC<EntityIconProps>` — 40×40 white rounded tile (radius 8px, subdued border), centered `EuiIcon` colored by `color`, and an `EuiNotificationBadge` count overlapping top-left when `showStackedShape(count)`.

- [ ] **Step 1: Write the failing test**

```tsx
// node/entity_node/entity_icon.test.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../mock/test_providers';
import { EntityIcon } from './entity_icon';
import { GRAPH_ENTITY_NODE_ICON_ID } from '../../test_ids';

describe('EntityIcon', () => {
  it('renders the icon tile', () => {
    render(
      <TestProviders>
        <EntityIcon icon="user" color="primary" />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_ICON_ID)).toBeInTheDocument();
  });

  it('renders a count badge when grouped', () => {
    render(
      <TestProviders>
        <EntityIcon icon="user" color="primary" count={5} />
      </TestProviders>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render a count badge for a single entity', () => {
    render(
      <TestProviders>
        <EntityIcon icon="user" color="primary" count={1} />
      </TestProviders>
    );
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_icon.test.tsx`
Expected: FAIL — cannot find module `./entity_icon`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// node/entity_node/entity_icon.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiNotificationBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { NodeColor } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { getSpanIcon } from '../get_span_icon';
import { showStackedShape } from '../../utils';
import { GRAPH_ENTITY_NODE_ICON_ID } from '../../test_ids';

export interface EntityIconProps {
  icon?: string;
  color?: NodeColor;
  count?: number;
}

const ICON_TILE_SIZE = 40;

export const EntityIcon = ({ icon, color = 'primary', count }: EntityIconProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        position: relative;
        width: ${ICON_TILE_SIZE}px;
        height: ${ICON_TILE_SIZE}px;
      `}
    >
      <div
        data-test-subj={GRAPH_ENTITY_NODE_ICON_ID}
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        {icon ? (
          <EuiIcon type={getSpanIcon(icon) ?? icon} size="l" color={color} aria-hidden={true} />
        ) : null}
      </div>
      {showStackedShape(count) ? (
        <EuiNotificationBadge
          color="accent"
          css={css`
            position: absolute;
            top: -${euiTheme.size.xs};
            left: -${euiTheme.size.xs};
          `}
        >
          {count}
        </EuiNotificationBadge>
      ) : null}
    </div>
  );
};

EntityIcon.displayName = 'EntityIcon';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_icon.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_icon.tsx x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_icon.test.tsx
git commit -m "feat(graph): add shared EntityIcon component"
```

---

### Task 5: EntityNodeMetadata section (gated rows)

**Files:**
- Create: `node/entity_node/entity_node_metadata.tsx`
- Test: `node/entity_node/entity_node_metadata.test.tsx`

**Interfaces:**
- Consumes: `Ips` (`node/ips/ips`), `CountryFlags` (`node/country_flags/country_flags`), `EntityRiskScore`, `EntityAssetCriticality` (types), metadata test ids
- Produces:
  - `interface EntityNodeMetadataProps { ips?: string[]; countryCodes?: string[]; entityId?: string; riskScore?: EntityRiskScore; assetCriticality?: EntityAssetCriticality; onIpClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; onCountryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; }`
  - `const EntityNodeMetadata: React.FC<EntityNodeMetadataProps>` — renders IP/Geolocation row, Entity ID row, Asset criticality (EuiHealth dots), Risk score (EuiBadge single value, or `min – max`), each **only when its data is present**. Wrapped in a container with `data-test-subj={GRAPH_ENTITY_NODE_METADATA_ID}`.

**Notes:** Asset criticality colors: extreme→`danger`, high→`risk`, medium→`warning`, low→`subdued`. Render a `EuiHealth` per present level with its count. Risk score: if `value != null` render one `EuiBadge`; else if `min != null && max != null` render `min` badge, `–`, `max` badge.

- [ ] **Step 1: Write the failing test**

```tsx
// node/entity_node/entity_node_metadata.test.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../mock/test_providers';
import { EntityNodeMetadata } from './entity_node_metadata';
import {
  GRAPH_ENTITY_NODE_METADATA_ID,
  GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID,
  GRAPH_ENTITY_NODE_RISK_SCORE_ID,
  GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID,
} from '../../test_ids';

describe('EntityNodeMetadata', () => {
  it('renders the container', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata entityId="john.doe" />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_METADATA_ID)).toBeInTheDocument();
  });

  it('renders the entity id row when present', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata entityId="john.doe" />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID)).toHaveTextContent('john.doe');
  });

  it('omits the entity id row when absent', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata riskScore={{ value: 10 }} />
      </TestProviders>
    );
    expect(screen.queryByTestId(GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID)).not.toBeInTheDocument();
  });

  it('renders a single risk score value', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata riskScore={{ value: 90.01 }} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_RISK_SCORE_ID)).toHaveTextContent('90.01');
  });

  it('renders a min-max risk score', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata riskScore={{ min: 40.5, max: 90.01 }} />
      </TestProviders>
    );
    const el = screen.getByTestId(GRAPH_ENTITY_NODE_RISK_SCORE_ID);
    expect(el).toHaveTextContent('40.5');
    expect(el).toHaveTextContent('90.01');
  });

  it('renders asset criticality when present', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata assetCriticality={{ high: 3, low: 2 }} />
      </TestProviders>
    );
    const el = screen.getByTestId(GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID);
    expect(el).toHaveTextContent('3');
    expect(el).toHaveTextContent('2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_metadata.test.tsx`
Expected: FAIL — cannot find module `./entity_node_metadata`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// node/entity_node/entity_node_metadata.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Ips } from '../ips/ips';
import { CountryFlags } from '../country_flags/country_flags';
import type { EntityRiskScore, EntityAssetCriticality } from '../../types';
import {
  GRAPH_ENTITY_NODE_METADATA_ID,
  GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID,
  GRAPH_ENTITY_NODE_RISK_SCORE_ID,
  GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID,
} from '../../test_ids';

export interface EntityNodeMetadataProps {
  ips?: string[];
  countryCodes?: string[];
  entityId?: string;
  riskScore?: EntityRiskScore;
  assetCriticality?: EntityAssetCriticality;
  onIpClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCountryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const IP_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.ipAddress', {
  defaultMessage: 'IP address',
});
const GEO_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.geolocation', {
  defaultMessage: 'Geolocation',
});
const ENTITY_ID_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.entityId', {
  defaultMessage: 'Entity ID',
});
const CRITICALITY_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.entityNode.assetCriticality',
  { defaultMessage: 'Asset criticality' }
);
const RISK_SCORE_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.riskScore', {
  defaultMessage: 'Risk score',
});
const EXTREME_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.extreme', {
  defaultMessage: 'extreme',
});
const HIGH_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.high', {
  defaultMessage: 'high',
});
const MEDIUM_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.medium', {
  defaultMessage: 'medium',
});
const LOW_LABEL = i18n.translate('securitySolutionPackages.csp.graph.entityNode.low', {
  defaultMessage: 'low',
});

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <EuiText size="xs">
    <strong>{children}</strong>
  </EuiText>
);

export const EntityNodeMetadata = ({
  ips,
  countryCodes,
  entityId,
  riskScore,
  assetCriticality,
  onIpClick,
  onCountryClick,
}: EntityNodeMetadataProps) => {
  const { euiTheme } = useEuiTheme();

  const hasIps = ips !== undefined && ips.length > 0;
  const hasFlags = countryCodes !== undefined && countryCodes.length > 0;
  const hasEntityId = entityId !== undefined && entityId.length > 0;
  const hasRisk =
    riskScore !== undefined &&
    (riskScore.value !== undefined || (riskScore.min !== undefined && riskScore.max !== undefined));

  const criticalityLevels: Array<{ color: string; count: number; label: string }> = [];
  if (assetCriticality) {
    if (assetCriticality.extreme !== undefined)
      criticalityLevels.push({ color: 'danger', count: assetCriticality.extreme, label: EXTREME_LABEL });
    if (assetCriticality.high !== undefined)
      criticalityLevels.push({ color: euiTheme.colors.textAccent, count: assetCriticality.high, label: HIGH_LABEL });
    if (assetCriticality.medium !== undefined)
      criticalityLevels.push({ color: 'warning', count: assetCriticality.medium, label: MEDIUM_LABEL });
    if (assetCriticality.low !== undefined)
      criticalityLevels.push({ color: 'subdued', count: assetCriticality.low, label: LOW_LABEL });
  }
  const hasCriticality = criticalityLevels.length > 0;

  return (
    <EuiFlexGroup
      data-test-subj={GRAPH_ENTITY_NODE_METADATA_ID}
      direction="column"
      gutterSize="m"
      css={css`
        padding: ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        white-space: nowrap;
      `}
    >
      {hasIps || hasFlags ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m">
            {hasIps ? (
              <EuiFlexItem>
                <FieldLabel>{IP_LABEL}</FieldLabel>
                <Ips ips={ips} onIpClick={onIpClick} />
              </EuiFlexItem>
            ) : null}
            {hasFlags ? (
              <EuiFlexItem>
                <FieldLabel>{GEO_LABEL}</FieldLabel>
                <CountryFlags countryCodes={countryCodes} onCountryClick={onCountryClick} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      {hasEntityId ? (
        <EuiFlexItem grow={false} data-test-subj={GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID}>
          <FieldLabel>{ENTITY_ID_LABEL}</FieldLabel>
          <EuiText size="xs">{entityId}</EuiText>
        </EuiFlexItem>
      ) : null}

      {hasCriticality ? (
        <EuiFlexItem grow={false} data-test-subj={GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID}>
          <FieldLabel>{CRITICALITY_LABEL}</FieldLabel>
          <EuiFlexGroup gutterSize="s" wrap>
            {criticalityLevels.map((lvl) => (
              <EuiFlexItem grow={false} key={lvl.label}>
                <EuiHealth color={lvl.color}>{`${lvl.count} ${lvl.label}`}</EuiHealth>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      {hasRisk ? (
        <EuiFlexItem grow={false} data-test-subj={GRAPH_ENTITY_NODE_RISK_SCORE_ID}>
          <FieldLabel>{RISK_SCORE_LABEL}</FieldLabel>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {riskScore?.value !== undefined ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{riskScore.value}</EuiBadge>
              </EuiFlexItem>
            ) : (
              <>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{riskScore?.min}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">{'–'}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">{riskScore?.max}</EuiBadge>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

EntityNodeMetadata.displayName = 'EntityNodeMetadata';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_metadata.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_metadata.tsx x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_metadata.test.tsx
git commit -m "feat(graph): add entity node metadata section"
```

---

### Task 6: EntityNodeDetailed card

**Files:**
- Create: `node/entity_node/entity_node_detailed.tsx`, `node/entity_node/entity_node_detailed.stories.tsx`
- Test: `node/entity_node/entity_node_detailed.test.tsx`

**Interfaces:**
- Consumes: `EntityIcon` (Task 4), `EntityNodeMetadata` (Task 5), `EntityNodeViewModel` (types), `showStackedShape` (utils), card test id
- Produces:
  - `interface EntityNodeDetailedProps { data: EntityNodeViewModel; }`
  - `const EntityNodeDetailed: React.FC<EntityNodeDetailedProps>` — 300px card: header (tinted by `color`) with `EntityIcon` + `label` (name) + `entityType`; when `showMetadata !== false`, `EntityNodeMetadata` with `ips/countryCodes/entityId/riskScore/assetCriticality`; when `showStackedShape(count)`, an 8px stacked bottom edge strip. Root `data-test-subj={GRAPH_ENTITY_NODE_CARD_ID}`.

- [ ] **Step 1: Write the failing test**

```tsx
// node/entity_node/entity_node_detailed.test.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../mock/test_providers';
import { EntityNodeDetailed } from './entity_node_detailed';
import type { EntityNodeViewModel } from '../../types';
import {
  GRAPH_ENTITY_NODE_CARD_ID,
  GRAPH_ENTITY_NODE_METADATA_ID,
} from '../../test_ids';

const baseData: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
  entityType: 'user',
};

describe('EntityNodeDetailed', () => {
  it('renders the card with name and type', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={baseData} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_CARD_ID)).toBeInTheDocument();
    expect(screen.getByText('Entity name')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('renders the metadata section by default', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={{ ...baseData, entityId: 'john.doe' }} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_METADATA_ID)).toBeInTheDocument();
  });

  it('hides the metadata section when showMetadata is false', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={{ ...baseData, entityId: 'john.doe', showMetadata: false }} />
      </TestProviders>
    );
    expect(screen.queryByTestId(GRAPH_ENTITY_NODE_METADATA_ID)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_detailed.test.tsx`
Expected: FAIL — cannot find module `./entity_node_detailed`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// node/entity_node/entity_node_detailed.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EntityIcon } from './entity_icon';
import { EntityNodeMetadata } from './entity_node_metadata';
import type { EntityNodeViewModel } from '../../types';
import { showStackedShape } from '../../utils';
import { GRAPH_ENTITY_NODE_CARD_ID } from '../../test_ids';

export interface EntityNodeDetailedProps {
  data: EntityNodeViewModel;
}

const CARD_WIDTH = 300;

export const EntityNodeDetailed = ({ data }: EntityNodeDetailedProps) => {
  const {
    color = 'primary',
    icon,
    label,
    entityType,
    entityId,
    ips,
    countryCodes,
    riskScore,
    assetCriticality,
    count,
    showMetadata = true,
    ipClickHandler,
    countryClickHandler,
  } = data;

  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('m');

  const isDanger = color === 'danger';
  const headerBg = isDanger ? euiTheme.colors.backgroundBaseDanger : euiTheme.colors.backgroundBasePrimary;
  const borderColor = isDanger ? euiTheme.colors.borderBaseDanger : euiTheme.colors.borderBasePrimary;
  const stacked = showStackedShape(count);

  return (
    <div
      data-test-subj={GRAPH_ENTITY_NODE_CARD_ID}
      css={css`
        width: ${CARD_WIDTH}px;
        border: ${euiTheme.border.width.thin} solid ${borderColor};
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        overflow: hidden;
        ${shadow}
      `}
    >
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        css={css`
          padding: ${euiTheme.size.s};
          background-color: ${headerBg};
        `}
      >
        <EuiFlexItem grow={false}>
          <EntityIcon icon={icon} color={color} count={count} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{label}</strong>
          </EuiText>
          {entityType ? (
            <EuiText size="xs" color="subdued">
              {entityType}
            </EuiText>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>

      {showMetadata ? (
        <EntityNodeMetadata
          ips={ips}
          countryCodes={countryCodes}
          entityId={entityId}
          riskScore={riskScore}
          assetCriticality={assetCriticality}
          onIpClick={ipClickHandler}
          onCountryClick={countryClickHandler}
        />
      ) : null}

      {stacked ? (
        <div
          css={css`
            height: ${euiTheme.size.s};
            margin: 0 ${euiTheme.size.m};
            border: ${euiTheme.border.width.thin} solid ${borderColor};
            border-top: none;
            border-bottom-left-radius: ${euiTheme.border.radius.medium};
            border-bottom-right-radius: ${euiTheme.border.radius.medium};
          `}
        />
      ) : null}
    </div>
  );
};

EntityNodeDetailed.displayName = 'EntityNodeDetailed';
```

```tsx
// node/entity_node/entity_node_detailed.stories.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EntityNodeDetailed } from './entity_node_detailed';
import type { EntityNodeViewModel } from '../../types';

const meta: Meta<typeof EntityNodeDetailed> = {
  title: 'Components/Graph Components/Entity Node Detailed',
  component: EntityNodeDetailed,
};

export default meta;
type Story = StoryObj<typeof EntityNodeDetailed>;

// Note: riskScore & assetCriticality are mocked here so the full card renders in
// Storybook. The live graph hides these rows until the backend supplies them.
const singleData: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
  entityType: 'Entity type',
  entityId: 'john.doe@12345678@activedirectory',
  ips: ['10.128.0.93'],
  countryCodes: ['us'],
  riskScore: { value: 90.01 },
  assetCriticality: { high: 1 },
};

const groupedData: EntityNodeViewModel = {
  ...singleData,
  count: 5,
  riskScore: { min: 40.5, max: 90.01 },
  assetCriticality: { extreme: 152, high: 1648, medium: 1982, low: 542 },
};

export const Single: Story = { args: { data: singleData } };
export const Grouped: Story = { args: { data: groupedData } };
export const Danger: Story = { args: { data: { ...singleData, color: 'danger' } } };
export const NoMetadata: Story = { args: { data: { ...singleData, showMetadata: false } } };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_detailed.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_detailed.tsx x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_detailed.test.tsx x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_detailed.stories.tsx
git commit -m "feat(graph): add detailed entity node card"
```

---

### Task 7: EntityNodeSimplified tile

**Files:**
- Create: `node/entity_node/entity_node_simplified.tsx`
- Test: `node/entity_node/entity_node_simplified.test.tsx`

**Interfaces:**
- Consumes: `EntityIcon` (Task 4), `EntityNodeViewModel` (types), simplified test id
- Produces:
  - `interface EntityNodeSimplifiedProps { data: EntityNodeViewModel; }`
  - `const EntityNodeSimplified: React.FC<EntityNodeSimplifiedProps>` — `EntityIcon` wrapped in an `EuiToolTip` whose content is `label`. Root `data-test-subj={GRAPH_ENTITY_NODE_SIMPLIFIED_ID}`.

- [ ] **Step 1: Write the failing test**

```tsx
// node/entity_node/entity_node_simplified.test.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../mock/test_providers';
import { EntityNodeSimplified } from './entity_node_simplified';
import type { EntityNodeViewModel } from '../../types';
import {
  GRAPH_ENTITY_NODE_SIMPLIFIED_ID,
  GRAPH_ENTITY_NODE_ICON_ID,
} from '../../test_ids';

const data: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
};

describe('EntityNodeSimplified', () => {
  it('renders the icon tile', () => {
    render(
      <TestProviders>
        <EntityNodeSimplified data={data} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_SIMPLIFIED_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_ICON_ID)).toBeInTheDocument();
  });

  it('renders the count badge when grouped', () => {
    render(
      <TestProviders>
        <EntityNodeSimplified data={{ ...data, count: 5 }} />
      </TestProviders>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_simplified.test.tsx`
Expected: FAIL — cannot find module `./entity_node_simplified`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// node/entity_node/entity_node_simplified.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { EntityIcon } from './entity_icon';
import type { EntityNodeViewModel } from '../../types';
import { GRAPH_ENTITY_NODE_SIMPLIFIED_ID } from '../../test_ids';

export interface EntityNodeSimplifiedProps {
  data: EntityNodeViewModel;
}

export const EntityNodeSimplified = ({ data }: EntityNodeSimplifiedProps) => {
  const { icon, color = 'primary', count, label, id } = data;

  return (
    <div data-test-subj={GRAPH_ENTITY_NODE_SIMPLIFIED_ID}>
      <EuiToolTip content={label ?? id} position="top">
        <EntityIcon icon={icon} color={color} count={count} />
      </EuiToolTip>
    </div>
  );
};

EntityNodeSimplified.displayName = 'EntityNodeSimplified';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_simplified.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_simplified.tsx x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node_simplified.test.tsx
git commit -m "feat(graph): add simplified entity node tile"
```

---

### Task 8: EntityNode smart wrapper + barrel export

**Files:**
- Create: `node/entity_node/entity_node.tsx`, `node/entity_node/index.ts`
- Test: `node/entity_node/entity_node.test.tsx`

**Interfaces:**
- Consumes: `useDetailLevel` (`detail_level`), `EntityNodeDetailed` (Task 6), `EntityNodeSimplified` (Task 7), `NodeProps`/`EntityNodeViewModel` (types), `NodeButton`/`HandleStyleOverride` (`node/styles`), `NodeExpandButton` (`node/node_expand_button`), `Handle`/`Position` (`@xyflow/react`), `GRAPH_ENTITY_NODE_ID`/`GRAPH_ENTITY_NODE_BUTTON_ID`/`GRAPH_NODE_EXPAND_BUTTON_ID` (test_ids)
- Produces:
  - `const EntityNode: React.FC<NodeProps>` — reads `useDetailLevel()`; renders shared handles + (when `interactive`) `NodeButton` + `NodeExpandButton`; renders `EntityNodeDetailed` when level is `'detailed'`, else `EntityNodeSimplified`. Root `data-test-subj={GRAPH_ENTITY_NODE_ID}`.
  - `index.ts` re-exports `EntityNode`.

**Notes:** Mock `useDetailLevel` in the test to drive each branch without a ReactFlow store. Verify expand click fires `expandButtonClick`.

- [ ] **Step 1: Write the failing test**

```tsx
// node/entity_node/entity_node.test.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactFlow } from '@xyflow/react';
import { TestProviders } from '../../mock/test_providers';
import { EntityNode } from './entity_node';
import type { EntityNodeViewModel } from '../../types';
import {
  GRAPH_ENTITY_NODE_CARD_ID,
  GRAPH_ENTITY_NODE_SIMPLIFIED_ID,
} from '../../test_ids';
import * as detailLevel from '../../detail_level';

jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  ONLY_RENDER_VISIBLE_ELEMENTS: false,
}));

const data: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
  interactive: true,
};

const renderNode = () =>
  render(
    <TestProviders>
      <ReactFlow
        fitView
        nodeTypes={{ rectangle: EntityNode }}
        nodes={[{ id: data.id, type: 'rectangle', position: { x: 0, y: 0 }, data }]}
        edges={[]}
      />
    </TestProviders>
  );

describe('EntityNode', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders the detailed card when detail level is detailed', () => {
    jest.spyOn(detailLevel, 'useDetailLevel').mockReturnValue('detailed');
    renderNode();
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_CARD_ID)).toBeInTheDocument();
  });

  it('renders the simplified tile when detail level is simplified', () => {
    jest.spyOn(detailLevel, 'useDetailLevel').mockReturnValue('simplified');
    renderNode();
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_SIMPLIFIED_ID)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node.test.tsx`
Expected: FAIL — cannot find module `./entity_node`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// node/entity_node/entity_node.tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { css } from '@emotion/react';
import { useDetailLevel } from '../../detail_level';
import { EntityNodeDetailed } from './entity_node_detailed';
import { EntityNodeSimplified } from './entity_node_simplified';
import type { EntityNodeViewModel, NodeProps } from '../../types';
import { HandleStyleOverride, NodeButton } from '../styles';
import { NodeExpandButton } from '../node_expand_button';
import { GRAPH_ENTITY_NODE_ID } from '../../test_ids';

export const EntityNode = memo<NodeProps>((props: NodeProps) => {
  const data = props.data as EntityNodeViewModel;
  const { color, interactive, expandButtonClick, nodeClick } = data;
  const level = useDetailLevel();

  return (
    <div
      data-test-subj={GRAPH_ENTITY_NODE_ID}
      css={css`
        position: relative;
      `}
    >
      {level === 'detailed' ? (
        <EntityNodeDetailed data={data} />
      ) : (
        <EntityNodeSimplified data={data} />
      )}
      {interactive ? (
        <>
          <NodeButton onClick={(e) => nodeClick?.(e, props)} />
          <NodeExpandButton
            color={color}
            onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
            x="100%"
            y="0"
          />
        </>
      ) : null}
      <Handle type="target" isConnectable={false} position={Position.Left} id="in" style={HandleStyleOverride} />
      <Handle type="source" isConnectable={false} position={Position.Right} id="out" style={HandleStyleOverride} />
    </div>
  );
});

EntityNode.displayName = 'EntityNode';
```

```ts
// node/entity_node/index.ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EntityNode } from './entity_node';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node.tsx x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/index.ts x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/entity_node/entity_node.test.tsx
git commit -m "feat(graph): add EntityNode smart wrapper"
```

---

### Task 9: Wire EntityNode into the graph & remove legacy shape nodes

**Files:**
- Modify: `graph/graph.tsx`, `node/index.ts`, `utils.ts`
- Delete: `node/rectangle_node.tsx`, `node/ellipse_node.tsx`, `node/hexagon_node.tsx`, `node/pentagon_node.tsx`, `node/diamond_node.tsx`, `node/node_details.tsx`, `node/node.test.tsx`
- Test: full-package Jest run + type check

**Interfaces:**
- Consumes: `EntityNode` (Task 8), `ZoomDetailLevelProvider` (Task 2)
- Produces: `nodeTypes` where `hexagon/pentagon/ellipse/rectangle/diamond/entity` all → `EntityNode`; graph wrapped in provider; `buildGraphFromViewModels` maps `entityType`/`entityId`.

- [ ] **Step 1: Update `node/index.ts`**

Replace the five shape exports with the entity export:

```ts
// node/index.ts
export { LabelNode } from './label_node/label_node';
export { EdgeGroupNode } from './edge_group_node';
export { RelationshipNode } from './relationship_node/relationship_node';
export { EntityNode } from './entity_node';
```

- [ ] **Step 2: Update `graph/graph.tsx` imports & nodeTypes**

Replace the node import block:

```tsx
import { LabelNode, EdgeGroupNode, RelationshipNode, EntityNode } from '../node';
import { ZoomDetailLevelProvider } from '../detail_level';
```

Replace `nodeTypes`:

```tsx
const nodeTypes = {
  hexagon: EntityNode,
  pentagon: EntityNode,
  ellipse: EntityNode,
  rectangle: EntityNode,
  diamond: EntityNode,
  entity: EntityNode,
  label: LabelNode,
  group: EdgeGroupNode,
  relationship: RelationshipNode,
};
```

- [ ] **Step 3: Wrap graph children with the provider**

Inside `<ReactFlow>`, wrap the existing children with `<ZoomDetailLevelProvider>`:

```tsx
<ReactFlow ...>
  <ZoomDetailLevelProvider>
    {interactive && (
      <Panel position="bottom-right">
        <Controls fitViewOptions={fitViewOptions} nodeIdsToCenterOn={originNodeIds} />
      </Panel>
    )}
    {children}
    <Background id={backgroundId} />
    {interactive && showMinimap && (
      <Minimap zoomable={!isLocked} pannable={!isLocked} nodesState={nodesState} />
    )}
  </ZoomDetailLevelProvider>
</ReactFlow>
```

- [ ] **Step 4: Map entityType/entityId in `utils.ts` `buildGraphFromViewModels`**

Update the entity branch of the node mapping so entity nodes carry `entityType`/`entityId` derived from documents/entity data. In the `nodes` map, after building the base `node`, add before returning:

```ts
if (isEntityNode(nodeData)) {
  const entity = nodeData.documentsData?.find((doc) => doc.type === 'entity')?.entity;
  node.data = {
    ...node.data,
    entityType: entity?.sub_type ?? entity?.type,
    entityId: nodeData.id,
  } as NodeViewModel;
}
```

Ensure `isEntityNode` is imported (it is defined in the same file, so no import needed).

- [ ] **Step 5: Delete legacy files**

```bash
git rm x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/rectangle_node.tsx \
  x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/ellipse_node.tsx \
  x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/hexagon_node.tsx \
  x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/pentagon_node.tsx \
  x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/diamond_node.tsx \
  x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/node_details.tsx \
  x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/node/node.test.tsx
```

- [ ] **Step 6: Fix any remaining references**

Run: `grep -rn "RectangleNode\|EllipseNode\|HexagonNode\|PentagonNode\|DiamondNode\|node_details\|NodeDetails" x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src`
Expected: only historical references in `node.stories.tsx`. Update `node/node.stories.tsx` to import and render `EntityNode` (single/grouped/danger args) instead of the deleted shape components; if the stories file is heavily coupled to shapes, replace its stories with `EntityNode` equivalents mirroring `entity_node_detailed.stories.tsx`.

- [ ] **Step 7: Run the full package tests**

Run: `node scripts/jest x-pack/solutions/security/packages/kbn-cloud-security-posture/graph`
Expected: PASS (entity_node + detail_level suites green; no references to deleted modules).

- [ ] **Step 8: Type check**

Run: `node scripts/type_check --project x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/tsconfig.json`
Expected: no errors.

- [ ] **Step 9: Lint**

Run: `node scripts/eslint x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add -A x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src
git commit -m "feat(graph): render EntityNode with zoom detail levels; remove legacy shape nodes"
```

---

### Task 10: i18n check

**Files:**
- Modify: (translation files updated automatically by the tool if needed)

- [ ] **Step 1: Run i18n check**

Run: `node scripts/i18n_check --fix`
Expected: passes; any new `securitySolutionPackages.csp.graph.entityNode.*` keys are registered.

- [ ] **Step 2: Commit if files changed**

```bash
git add -A
git commit -m "chore(graph): i18n for entity node metadata labels"
```

---

## Self-Review

**1. Spec coverage:**
- Detail-level mechanism (context provider, threshold, useStore) → Tasks 1, 2, wired in Task 9. ✓
- One EntityNode + variant sub-components (Approach A) → Tasks 4–8. ✓
- Keep 5 shape values mapping to EntityNode → Task 9 nodeTypes. ✓
- New optional view-model fields, render-only gating → Tasks 3, 5, 6. ✓
- Reuse Ips/CountryFlags/NodeExpandButton/showStackedShape/isEntityNode → Tasks 5, 8, 4, 9. ✓
- Storybook with mock risk/criticality → Task 6 stories. ✓
- showMetadata prop default on → Tasks 3, 6. ✓
- Delete legacy shape components + node_details → Task 9. ✓
- Simplified tile name via tooltip → Task 7. ✓
- Grouped stacked edge + count badge → Tasks 4, 6. ✓
- Danger/default state → Tasks 4, 6. ✓

**2. Placeholder scan:** No TBD/TODO; every code step contains full code. Task 9 Step 6 gives a conditional instruction for the stories file but includes the concrete fallback (mirror `entity_node_detailed.stories.tsx`). ✓

**3. Type consistency:** `DetailLevel` values `'simplified' | 'detailed'` consistent across Tasks 1, 2, 8. `EntityRiskScore`/`EntityAssetCriticality` field names (`value/min/max`, `extreme/high/medium/low`) consistent across Tasks 3, 5, 6. `useDetailLevel` name consistent (Tasks 2, 8, 9). Test id constants consistent with Task 3 definitions. `EntityIconProps.count` gating via `showStackedShape` consistent (Tasks 4, 6, 7). ✓

## Out of scope (per spec)

Event/alert/relationship pill redesign; bottom control bar & Display panel toggle; expanded icon mapping / AI-LLM icons; backend sourcing of risk score & asset criticality; keyboard shortcuts; in-graph search; select/pan mode separation.
