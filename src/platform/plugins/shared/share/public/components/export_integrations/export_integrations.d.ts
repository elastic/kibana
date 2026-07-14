import React, { type FC } from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import { type IShareContext, useShareTypeContext } from '../context';
import type { ExportShareConfig, ShareContext } from '../../types';
export declare const ExportMenu: FC<{
    shareContext: IShareContext;
}>;
export interface ManagedExportFlyoutProps {
    exportIntegration: ExportShareConfig;
    intl: InjectedIntl;
    isDirty: boolean;
    onCloseFlyout: () => void;
    publicAPIEnabled?: boolean;
    shareObjectType: string;
    shareObjectTypeAlias?: string;
    shareObjectTypeMeta: ReturnType<typeof useShareTypeContext<'integration', 'export'>>['objectTypeMeta'];
    onSave?: () => Promise<void>;
    isSaving?: boolean;
    sharingData: {
        [key: string]: unknown;
    };
    shareableUrlLocatorParams?: ShareContext['shareableUrlLocatorParams'];
}
export declare function ManagedExportFlyout({ exportIntegration, intl, isDirty, onCloseFlyout, publicAPIEnabled, shareObjectTypeMeta, shareObjectType, shareObjectTypeAlias, onSave, isSaving, sharingData, }: ManagedExportFlyoutProps): React.JSX.Element;
