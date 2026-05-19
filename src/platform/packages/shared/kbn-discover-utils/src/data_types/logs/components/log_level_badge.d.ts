import type { ReactElement } from 'react';
import React from 'react';
import type { EuiBadgeProps } from '@elastic/eui';
export declare const LogLevelBadge: ({ logLevel, fallback, "data-test-subj": dataTestSubj, ...badgeProps }: Omit<EuiBadgeProps, "children" | "color"> & {
    logLevel: {};
    fallback?: ReactElement;
}) => React.JSX.Element;
