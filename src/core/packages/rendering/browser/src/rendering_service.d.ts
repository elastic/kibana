import type React from 'react';
export interface RenderingService {
    addContext: (element: React.ReactNode) => React.ReactElement;
}
