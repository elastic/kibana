Vagrant.configure("2") do |config|
  config.vm.synced_folder 'target/', '/packages'

  config.vm.define "es" do |es|
    es.vm.box = "generic/debian9"
    es.vm.provision "ansible" do |ansible|
      ansible.playbook = "test/package/es/playbook.yml"
    end
    es.vm.network "private_network", ip: "192.168.50.5"
    es.vm.network "forwarded_port", guest: 9200, host: 9200
  end

  config.vm.define "tar" do |tar|
    tar.vm.box = 'generic/centos/8'
  end

  config.vm.define "deb" do |deb|
    deb.vm.box = 'generic/debian9'
  end

  config.vm.define "rpm" do |rpm|
    rpm.vm.box = 'generic/rhel8'
    rpm.vm.provision "ansible" do |ansible|
      ansible.playbook = "test/package/rpm/playbook.yml"
    end
    rpm.vm.network "private_network", ip: "192.168.50.6"
    rpm.vm.network "forwarded_port", guest: 5601, host: 5601
  end

  config.vm.define "docker" do |docker|
    docker.vm.box = 'generic/ubuntu2004'
    docker.vm.provision "ansible" do |ansible|
      ansible.playbook = "test/package/docker/playbook.yml"
    end
  end
end
