/**
 * This import registers the Console monaco language contribution
 */
import './language';
export { CONSOLE_LANG_ID, CONSOLE_OUTPUT_LANG_ID } from './constants';
export type { ConsoleOutputParsedResponse, ConsoleOutputParser, ConsoleOutputParserResult, ConsoleParser, ConsoleParserResult, ConsoleParserReviver, ConsoleWorkerDefinition, ErrorAnnotation, ParsedRequest, } from './types';
export { getParsedRequestsProvider, ConsoleLang, ConsoleOutputLang, CONSOLE_THEME_ID, CONSOLE_OUTPUT_THEME_ID, CONSOLE_TRIGGER_CHARS, } from './language';
export { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';
export { ConsoleWorkerProxyService } from './console_worker_proxy';
export { createOutputParser } from './output_parser';
