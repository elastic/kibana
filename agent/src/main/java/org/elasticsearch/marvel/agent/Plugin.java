/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



/*
 * Licensed to ElasticSearch under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. ElasticSearch licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.elasticsearch.marvel.agent;

import org.elasticsearch.Version;
import org.elasticsearch.common.collect.ImmutableList;
import org.elasticsearch.common.component.LifecycleComponent;
import org.elasticsearch.common.inject.Module;
import org.elasticsearch.common.logging.ESLogger;
import org.elasticsearch.common.logging.Loggers;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.plugins.AbstractPlugin;

import java.util.ArrayList;
import java.util.Collection;

public class Plugin extends AbstractPlugin {

    final ESLogger logger = Loggers.getLogger(getClass());

    // copied here because we can't depend on it available
    public static final int V_0_90_9_ID = /*00*/900999;
    public static final int V_1_0_0_Beta1_ID = 1000001;
    public static final int V_1_0_0_Beta2_ID = 1000002;


    public final boolean enabled;

    public Plugin() {
        if (Version.CURRENT.id == V_1_0_0_Beta1_ID || Version.CURRENT.id == V_1_0_0_Beta2_ID) {
            logger.warn("Elasticsearch version [{}] is incompatible with Marvel. Please upgrade to version 1.0.0.RC1 or higher.", Version.CURRENT);
            enabled = false;
        } else if (Version.CURRENT.id < V_0_90_9_ID) {
            logger.warn("Elasticsearch version [{}] is too old. Marvel is disabled (requires version 0.90.9 or higher).", Version.CURRENT);
            enabled = false;
        } else {
            enabled = true;
        }
    }

    @Override
    public String name() {
        return "marvel";
    }

    @Override
    public String description() {
        return "Elasticsearch Management & Monitoring";
    }

    @Override
    public Collection<Module> modules(Settings settings) {
        if (!enabled) {
            return ImmutableList.of();
        }
        return ImmutableList.of((Module) new AgentModule());
    }

    @Override
    public Collection<Class<? extends LifecycleComponent>> services() {
        Collection<Class<? extends LifecycleComponent>> l = new ArrayList<Class<? extends LifecycleComponent>>();
        if (enabled) {
            l.add(AgentService.class);
        }
        return l;
    }
}
