import * as React from 'react';
import type { ConnectionDetailsOpts } from '../types';
export declare const context: React.Context<ConnectionDetailsOpts>;
export declare const ConnectionDetailsOptsProvider: React.FC<React.PropsWithChildren<ConnectionDetailsOpts>>;
export declare const useConnectionDetailsOpts: () => ConnectionDetailsOpts;
