export type SetStateToKbnUrlHashOptions = {
    useHash: boolean;
    storeInHashQuery?: boolean;
};
export declare function createSetStateToKbnUrl(createHash: <State>(rawState: State) => string): <State>(key: string, state: State, { useHash, storeInHashQuery }: SetStateToKbnUrlHashOptions | undefined, rawUrl: string) => string;
/**
 * Common version of setStateToKbnUrl which doesn't use session storage.
 *
 * Sets state to the url by key and returns a new url string.
 *
 * e.g.:
 * given a url: http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:indexedFields)&_b=(f:test,i:'',l:'')
 * key: '_a'
 * and state: {tab: 'other'}
 *
 * will return url:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a=(tab:other)&_b=(f:test,i:'',l:'')
 *
 * By default due to Kibana legacy reasons assumed that state is stored in a query inside a hash part of the URL:
 * http://localhost:5601/oxf/app/kibana#/yourApp?_a={STATE}
 *
 * { storeInHashQuery: true } option should be used in you want to store you state in a main query (not in a hash):
 * http://localhost:5601/oxf/app/kibana?_a={STATE}#/yourApp
 */
export declare function setStateToKbnUrl<State>(key: string, state: State, hashOptions: SetStateToKbnUrlHashOptions, rawUrl: string): string;
