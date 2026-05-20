import type { monaco } from '@kbn/monaco';
import type { RequestResult } from '../../../hooks/use_send_current_request/send_request';
import type { StatusCodeClassNames } from '../types';
export declare const getStatusCodeDecorations: (data: RequestResult[], classNames: StatusCodeClassNames) => monaco.editor.IModelDeltaDecoration[];
