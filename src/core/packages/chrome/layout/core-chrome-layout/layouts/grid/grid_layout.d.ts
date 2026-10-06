import React from 'react';
import type { LayoutService, LayoutServiceStartDeps } from '../../layout_service';
/**
 * Service for providing layout component wired to other core services.
 */
export declare class GridLayout implements LayoutService {
    private readonly deps;
    constructor(deps: LayoutServiceStartDeps);
    /**
     * Returns a layout component with the provided dependencies
     */
    getComponent(): React.ComponentType;
}
