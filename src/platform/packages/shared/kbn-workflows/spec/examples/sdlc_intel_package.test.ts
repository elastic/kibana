/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';

import { WORKFLOW_EXAMPLES, getWorkflowExamplesDir } from './index';

const FLEET_PACKAGE_ROOT = path.resolve(
  __dirname,
  '../../../../../../../x-pack/solutions/security/packages/sdlc_intel_fleet_package/sdlc_intel-0.1.0'
);

describe('SDLC intel golden-path assets', () => {
  it('ships fleet workflows mirrored in bundled examples', () => {
    const fleetWorkflowDir = path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow');
    const fleetWorkflows = fs
      .readdirSync(fleetWorkflowDir)
      .filter((file) => file.endsWith('.yaml'))
      .map((file) => file.replace(/\.yaml$/, '').replace(/-/g, '_'));

    const exampleIds = WORKFLOW_EXAMPLES.filter((entry) => entry.id.startsWith('sdlc_')).map(
      (entry) => entry.id.replace(/^sdlc_/, '')
    );

    for (const workflow of fleetWorkflows) {
      expect(exampleIds).toContain(workflow);
    }
  });

  it('loads every bundled SDLC example YAML from disk', () => {
    const examplesDir = getWorkflowExamplesDir();

    for (const example of WORKFLOW_EXAMPLES.filter((entry) => entry.id.startsWith('sdlc_'))) {
      const filePath = path.join(examplesDir, example.filename);
      expect(fs.existsSync(filePath)).toBe(true);
      const contents = fs.readFileSync(filePath, 'utf8');
      expect(contents).toContain('version:');
      expect(contents).toContain('steps:');
    }
  });

  it('wires ILM retention to every index template', () => {
    const templateDir = path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/index_template');
    const templates = fs.readdirSync(templateDir).filter((file) => file.endsWith('.json'));

    expect(templates.length).toBeGreaterThan(0);

    for (const file of templates) {
      const template = JSON.parse(fs.readFileSync(path.join(templateDir, file), 'utf8'));
      expect(template.template.settings['index.lifecycle.name']).toBe('sdlc_intel_retention');
    }
  });

  it('includes Phase B fleet package assets', () => {
    expect(fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/ilm_policy/sdlc_intel_retention.json'))).toBe(
      true
    );
    expect(fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/esql_view/sdlc_ingest_health.yml'))).toBe(
      true
    );
    expect(fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/dashboard/sdlc-intel-ingest-health.json'))).toBe(
      true
    );
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/github-catalog-project-views.yaml'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/github-build-release-calendar.yaml'))
    ).toBe(true);
    expect(fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/slack-thread-replies.yaml'))).toBe(true);

    const manifest = fs.readFileSync(path.join(FLEET_PACKAGE_ROOT, 'manifest.yml'), 'utf8');
    expect(manifest).toContain('github_connector_id');
    expect(manifest).toContain('slack_connector_id');
    expect(manifest).toContain('salesforce_connector_id');
    expect(manifest).toContain('salesforce_case_github_field');
    expect(manifest).toContain('sdh_repo_pattern');
  });

  it('includes Phase C1 feedback-loop assets', () => {
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/index_template/salesforce-intel-cases.json'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/index_template/github-intel-sdh-issues.json'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/salesforce-catalog-cases.yaml'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/github-catalog-sdh-issues.yaml'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/cross-link-feedback-loop.yaml'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/esql_view/sdlc_salesforce_feedback.yml'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/dashboard/sdlc-intel-salesforce-feedback.json'))
    ).toBe(true);
  });

  it('includes Phase C2 feedback-loop extensions', () => {
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/cross-link-sdh-product.yaml'))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/github-catalog-sdh-labeled-issues.yaml')
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/esql_view/sdlc_feedback_loop_enriched.yml')
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(FLEET_PACKAGE_ROOT, 'kibana/index_pattern/sdlc-feedback-loop-enriched-view.json')
      )
    ).toBe(true);

    const manifest = fs.readFileSync(path.join(FLEET_PACKAGE_ROOT, 'manifest.yml'), 'utf8');
    expect(manifest).toContain('salesforce_product_area_field');
    expect(manifest).toContain('sdh_label');
  });

  it('includes Phase D Google Drive design-doc assets', () => {
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/index_template/gdrive-intel-documents.json'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/gdrive-catalog-roadmap-docs.yaml'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'kibana/workflow/github-extract-drive-links.yaml'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(FLEET_PACKAGE_ROOT, 'elasticsearch/esql_view/sdlc_design_doc_coverage.yml'))
    ).toBe(true);

    const manifest = fs.readFileSync(path.join(FLEET_PACKAGE_ROOT, 'manifest.yml'), 'utf8');
    expect(manifest).toContain('google_drive_connector_id');
    expect(manifest).toContain('gdrive_roadmap_folder_ids');
  });
});
