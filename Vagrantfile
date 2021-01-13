Vagrant.configure("2") do |config|
  config.vm.synced_folder 'target/', '/packages'

  config.vm.define "deb" do |deb|
    deb.vm.box = 'generic/debian9'
    deb.vm.provision "ansible" do |ansible|
      ansible.playbook = "test/package/deb/playbook.yml"
    end
    deb.vm.network "private_network", ip: "192.168.50.5"
  end

  config.vm.define "rpm" do |rpm|
    rpm.vm.box = 'generic/centos8'
    rpm.vm.provision "ansible" do |ansible|
      ansible.playbook = "test/package/rpm/playbook.yml"
    end
    rpm.vm.network "private_network", ip: "192.168.50.6"
  end

  config.vm.define "docker" do |docker|
    docker.vm.box = 'generic/ubuntu2004'
    docker.vm.provision "ansible" do |ansible|
      ansible.playbook = "test/package/docker/playbook.yml"
    end
    docker.vm.network "private_network", ip: "192.168.50.7"
  end
end
