import type { EditorError } from '@elastic/esql/types';
import type { ESQLMessage } from '@kbn/esql-language';
import type { MonacoEditorError } from '../../../../types';
import { monaco } from '../../../../monaco_imports';
export declare function offsetToRowColumn(expression: string, offset: number): monaco.Position;
export declare function wrapAsMonacoMessages(queryString: string, messages: Array<ESQLMessage | EditorError>): MonacoEditorError[];
