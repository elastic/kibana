import type { Observable } from 'rxjs';
import type { LangValidation, SyntaxErrors } from '../../types';
import type { PainlessContext, PainlessAutocompleteField } from './types';
import { PainlessCompletionAdapter } from './completion_adapter';
export declare const getSuggestionProvider: (context: PainlessContext, fields?: PainlessAutocompleteField[]) => PainlessCompletionAdapter;
export declare const getSyntaxErrors: () => SyntaxErrors;
export declare const validation$: () => Observable<LangValidation>;
