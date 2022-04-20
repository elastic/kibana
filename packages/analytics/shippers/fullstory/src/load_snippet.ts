/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FullStoryApi } from './types';

export interface FullStorySnippetConfig {
  /**
   * The FullStory account id.
   */
  fullStoryOrgId: string;
  /**
   * The host to send the data to. Used to overcome AdBlockers by using custom DNSs.
   * If not specified, it defaults to `fullstory.com`.
   */
  host?: string;
  /**
   * The URL to load the FullStory client from. Falls back to `edge.fullstory.com/s/fs.js` if not specified.
   */
  scriptUrl?: string;
  /**
   * Whether the debug logs should be printed to the console.
   */
  debug?: boolean;
  /**
   * The name of the variable where the API is stored: `window[namespace]`. Defaults to `FS`.
   */
  namespace?: string;
}

export function loadSnippet({
  scriptUrl = 'edge.fullstory.com/s/fs.js',
  fullStoryOrgId,
  host = 'fullstory.com',
  namespace = 'FS',
  debug = false,
}: FullStorySnippetConfig): FullStoryApi {
  window._fs_debug = debug;
  window._fs_host = host;
  window._fs_script = scriptUrl;
  window._fs_org = fullStoryOrgId;
  window._fs_namespace = namespace;

  /* eslint-disable */
  (function(m,n,e,t,l,o,g,y){
    if (e in m) {if(m.console && m.console.log) { m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].');} return;}
    // @ts-expect-error
    g=m[e]=function(a,b,s){g.q?g.q.push([a,b,s]):g._api(a,b,s);};g.q=[];
    // @ts-expect-error
    o=n.createElement(t);o.async=1;o.crossOrigin='anonymous';o.src=_fs_script;
    // @ts-expect-error
    y=n.getElementsByTagName(t)[0];y.parentNode.insertBefore(o,y);
    // @ts-expect-error
    g.identify=function(i,v,s){g(l,{uid:i},s);if(v)g(l,v,s)};g.setUserVars=function(v,s){g(l,v,s)};g.event=function(i,v,s){g('event',{n:i,p:v},s)};
    // @ts-expect-error
    g.anonymize=function(){g.identify(!!0)};
    // @ts-expect-error
    g.shutdown=function(){g("rec",!1)};g.restart=function(){g("rec",!0)};
    // @ts-expect-error
    g.log = function(a,b){g("log",[a,b])};
    // @ts-expect-error
    g.consent=function(a){g("consent",!arguments.length||a)};
    // @ts-expect-error
    g.identifyAccount=function(i,v){o='account';v=v||{};v.acctId=i;g(o,v)};
    // @ts-expect-error
    g.clearUserCookie=function(){};
    // @ts-expect-error
    g.setVars=function(n, p){g('setVars',[n,p]);};
    // @ts-expect-error
    g._w={};y='XMLHttpRequest';g._w[y]=m[y];y='fetch';g._w[y]=m[y];
    // @ts-expect-error
    if(m[y])m[y]=function(){return g._w[y].apply(this,arguments)};
    // @ts-expect-error
    g._v="1.3.0";

  })(window,document,window['_fs_namespace'],'script','user');

  const fullStoryApi = window[namespace as 'FS'];

  if (!fullStoryApi) {
    throw new Error('FullStory snippet failed to load. Check browser logs for more information.');
  }

  return fullStoryApi;
}
