/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DocLinks } from '@kbn/doc-links';

class ESDocLinks {
  public connectors: string = '';
  public connectorsAzureBlobStorage: string = '';
  public connectorsBox: string = '';
  public connectorsClients: string = '';
  public connectorsConfluence: string = '';
  public connectorsDropbox: string = '';
  public connectorsGithub: string = '';
  public connectorsGmail: string = '';
  public connectorsGoogleCloudStorage: string = '';
  public connectorsGoogleDrive: string = '';
  public connectorsJira: string = '';
  public connectorsMicrosoftSQL: string = '';
  public connectorsMongoDB: string = '';
  public connectorsMySQL: string = '';
  public connectorsNative: string = '';
  public connectorsNetworkDrive: string = '';
  public connectorsNotion: string = '';
  public connectorsOneDrive: string = '';
  public connectorsOracle: string = '';
  public connectorsOutlook: string = '';
  public connectorsPostgreSQL: string = '';
  public connectorsRedis: string = '';
  public connectorsS3: string = '';
  public connectorsSalesforce: string = '';
  public connectorsServiceNow: string = '';
  public connectorsSharepoint: string = '';
  public connectorsSharepointOnline: string = '';
  public connectorsSlack: string = '';
  public connectorsTeams: string = '';
  public connectorsZoom: string = '';

  constructor() {}

  setDocLinks(docLinks: DocLinks) {
    this.connectors = docLinks.enterpriseSearch.connectors;
    this.connectorsAzureBlobStorage = docLinks.enterpriseSearch.connectorsAzureBlobStorage;
    this.connectorsBox = docLinks.enterpriseSearch.connectorsBox;
    this.connectorsConfluence = docLinks.enterpriseSearch.connectorsConfluence;
    this.connectorsClients = docLinks.enterpriseSearch.connectorsClients;
    this.connectorsDropbox = docLinks.enterpriseSearch.connectorsDropbox;
    this.connectorsGithub = docLinks.enterpriseSearch.connectorsGithub;
    this.connectorsGoogleCloudStorage = docLinks.enterpriseSearch.connectorsGoogleCloudStorage;
    this.connectorsGoogleDrive = docLinks.enterpriseSearch.connectorsGoogleDrive;
    this.connectorsGmail = docLinks.enterpriseSearch.connectorsGmail;
    this.connectorsJira = docLinks.enterpriseSearch.connectorsJira;
    this.connectorsMicrosoftSQL = docLinks.enterpriseSearch.connectorsMicrosoftSQL;
    this.connectorsMongoDB = docLinks.enterpriseSearch.connectorsMongoDB;
    this.connectorsMySQL = docLinks.enterpriseSearch.connectorsMySQL;
    this.connectorsNative = docLinks.enterpriseSearch.connectorsNative;
    this.connectorsNetworkDrive = docLinks.enterpriseSearch.connectorsNetworkDrive;
    this.connectorsNotion = docLinks.enterpriseSearch.connectorsNotion;
    this.connectorsOneDrive = docLinks.enterpriseSearch.connectorsOneDrive;
    this.connectorsOracle = docLinks.enterpriseSearch.connectorsOracle;
    this.connectorsOutlook = docLinks.enterpriseSearch.connectorsOutlook;
    this.connectorsPostgreSQL = docLinks.enterpriseSearch.connectorsPostgreSQL;
    this.connectorsRedis = docLinks.enterpriseSearch.connectorsRedis;
    this.connectorsS3 = docLinks.enterpriseSearch.connectorsS3;
    this.connectorsSalesforce = docLinks.enterpriseSearch.connectorsSalesforce;
    this.connectorsServiceNow = docLinks.enterpriseSearch.connectorsServiceNow;
    this.connectorsSharepoint = docLinks.enterpriseSearch.connectorsSharepoint;
    this.connectorsSharepointOnline = docLinks.enterpriseSearch.connectorsSharepointOnline;
    this.connectorsSlack = docLinks.enterpriseSearch.connectorsSlack;
    this.connectorsTeams = docLinks.enterpriseSearch.connectorsTeams;
    this.connectorsZoom = docLinks.enterpriseSearch.connectorsZoom;
  }
}

export const docLinks = new ESDocLinks();
